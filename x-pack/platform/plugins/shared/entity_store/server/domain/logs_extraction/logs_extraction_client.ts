/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import moment from 'moment';
import { SavedObjectsErrorHelpers, type ElasticsearchClient } from '@kbn/core/server';
import type { DataViewsService } from '@kbn/data-views-plugin/common';
import { isNonLocalIndexName } from '@kbn/es-query';
import type { ExtractionAttributes } from '../../monitor/metrics';
import { buildExtractionAttributes, entityStoreMetrics } from '../../monitor/metrics';
import type {
  EntityType,
  GatedEntityDefinition,
  ManagedEntityDefinition,
  ExtractionMode,
} from '../../../common/domain/definitions/entity_schema';
import { EXTRACTION_MODE } from '../../../common/domain/definitions/entity_schema';
import {
  getEntityDefinition,
  supportsNonPrioritySampling,
} from '../../../common/domain/definitions/registry';
import { resolveSamplingRate } from './sampling';
import { type LogSlicePaginationParams, type PaginationParams } from './query_builder_commons';
import {
  buildLogPaginationCursorProbeEsql,
  interpretLogPaginationCursorRows,
  type LogPaginationCursor,
  parseLogPaginationCursorRow,
} from './log_pagination_probe_query_builder';
import {
  buildLogsExtractionEsqlQuery,
  extractMainPaginationParams,
  HASHED_ID_FIELD,
} from './logs_extraction_query_builder';
import {
  applyMaxLagCutoff,
  capExtractionWindowEnd,
  resolveMainExtractionWindow,
  validateExtractionWindow,
} from './extraction_window';
import { capAtMaxLogsPerWindow, pickSampleProbability } from './effective_page_limits';
import { getMergedConfig, type MergedLogExtractionConfig } from '../config';
import { resolveLatestEntitiesIndexName } from '../asset_manager/resolve_entity_store_indices';
import { executeEsqlQuery } from '../../infra/elasticsearch/esql';
import { executeEsqlQueryRetryingRemoteResources } from '../../infra/elasticsearch/remote_resource_not_supported';
import { ingestEntities } from '../../infra/elasticsearch/ingest';
import { resolveClosedIndexAdjustments } from '../../infra/elasticsearch/resolve_closed_indices';
import {
  isPositiveInternalEsqlViewIndexPattern,
  withInternalEsqlViewExclusions,
} from './internal_esql_view_patterns';
import {
  getAlertsIndexName,
  getSecuritySolutionDataViewName,
} from '../asset_manager/external_indices_contants';
import { type LogExtractionConfig } from '../saved_objects';
import {
  type EngineDescriptor,
  type EngineDescriptorClient,
  type EngineError,
  type EngineLogExtractionState,
  type EntityStoreGlobalStateClient,
} from '../saved_objects';
import { ENGINE_STATUS } from '../constants';
import { EntityStoreNotRunningError, NonPriorityExtractionDisabledError } from '../errors';
import type { LogExtractionInstallParams } from '../../routes/constants';

/** Engine state with all cursor fields cleared. Used between sub-window iterations so a fresh
 * sub-window does not re-trigger recovery from cursors persisted by an earlier sub-window. */
const FRESH_ENGINE_LOG_EXTRACTION_STATE: EngineLogExtractionState = {
  checkpointTimestamp: null,
  paginationId: null,
  lastExecutionTimestamp: null,
  sliceEndTimestamp: null,
  sliceSamplingRate: null,
};

interface LogsExtractionOptions {
  specificWindow?: {
    fromDateISO: string;
    toDateISO: string;
  };
  signal?: AbortSignal;
}

interface ExtractedLogsSummarySuccess {
  success: true;
  isRemote: boolean;
  count: number;
  pages: number;
  scannedIndices: string[];
  lastSearchTimestamp: string;
  logsCapApplied: boolean;
  logsProcessed: number;
}

interface ExtractedLogsSummaryError {
  success: false;
  isRemote: boolean;
  error: Error;
}

type ExtractedLogsSummary = ExtractedLogsSummarySuccess | ExtractedLogsSummaryError;

export interface LogsExtractionClientDependencies {
  logger: Logger;
  namespace: string;
  esClient: ElasticsearchClient;
  dataViewsService: DataViewsService;
  engineDescriptorClient: EngineDescriptorClient;
  globalStateClient: EntityStoreGlobalStateClient;
  extractionMode?: ExtractionMode;
}

export class LogsExtractionClient {
  /**
   * Maps each extraction mode to the descriptor fields holding its cursor, status and error.
   * single and priority share the original fields; nonPriority has its own set, so the two
   * processes never write the same key and cannot overwrite each other.
   *
   * Every read and write of these three must go through this map. Reading `status` directly would
   * make stopping one process stop the other, since extraction is gated on it, and clearing
   * `error` directly would let a non-priority success wipe a priority failure.
   */
  private static readonly DESCRIPTOR_FIELDS_BY_MODE = {
    single: { state: 'logExtractionState', status: 'status', error: 'error' },
    priority: { state: 'logExtractionState', status: 'status', error: 'error' },
    nonPriority: {
      state: 'nonPriorityLogExtractionState',
      status: 'nonPriorityStatus',
      error: 'nonPriorityError',
    },
  } as const satisfies Record<ExtractionMode, Record<string, keyof EngineDescriptor>>;

  private get descriptorFields() {
    return LogsExtractionClient.DESCRIPTOR_FIELDS_BY_MODE[this.extractionMode];
  }

  logger: Logger;
  namespace: string;
  esClient: ElasticsearchClient;
  dataViewsService: DataViewsService;
  engineDescriptorClient: EngineDescriptorClient;
  globalStateClient: EntityStoreGlobalStateClient;
  extractionMode: ExtractionMode;
  constructor({
    logger,
    namespace,
    esClient,
    dataViewsService,
    engineDescriptorClient,
    globalStateClient,
    extractionMode,
  }: LogsExtractionClientDependencies) {
    this.logger = logger;
    this.namespace = namespace;
    this.esClient = esClient;
    this.dataViewsService = dataViewsService;
    this.engineDescriptorClient = engineDescriptorClient;
    this.globalStateClient = globalStateClient;
    this.extractionMode = extractionMode ?? EXTRACTION_MODE.single;
  }

  private extractionStatePatch(state: EngineLogExtractionState): Partial<EngineDescriptor> {
    return { [this.descriptorFields.state]: state } as Partial<EngineDescriptor>;
  }

  /**
   * Attributes shared by every extraction metric this client emits. Built once per run and
   * threaded down, so the two processes stay on separate series and `remote` reflects the
   * index patterns actually resolved rather than a hardcoded guess.
   */
  private getExtractionAttributes(type: EntityType, remote: boolean): ExtractionAttributes {
    return buildExtractionAttributes(type, this.namespace, this.extractionMode, remote);
  }

  private errorPatch(error: EngineError | null): Partial<EngineDescriptor> {
    return { [this.descriptorFields.error]: error } as Partial<EngineDescriptor>;
  }

  private async getLogExtractionConfigAndState(type: EntityType): Promise<{
    config: MergedLogExtractionConfig;
    engineState: EngineLogExtractionState;
  }> {
    const engineDescriptor = await this.engineDescriptorClient.findOrThrow(type);
    const status = engineDescriptor[this.descriptorFields.status];
    if (status !== ENGINE_STATUS.STARTED) {
      if (this.extractionMode === EXTRACTION_MODE.nonPriority && status === ENGINE_STATUS.STOPPED) {
        throw new NonPriorityExtractionDisabledError();
      }
      throw new EntityStoreNotRunningError();
    }
    const globalOverrides = await this.globalStateClient.findLogExtractionOverrides();
    const engineState =
      this.extractionMode === EXTRACTION_MODE.nonPriority
        ? engineDescriptor.nonPriorityLogExtractionState ?? FRESH_ENGINE_LOG_EXTRACTION_STATE
        : engineDescriptor.logExtractionState;
    return {
      config: getMergedConfig(
        type,
        globalOverrides,
        engineDescriptor.logExtractionConfig,
        this.extractionMode,
        this.extractionMode === EXTRACTION_MODE.nonPriority
          ? engineDescriptor.nonPriorityLogExtractionConfig
          : undefined
      ),
      engineState,
    };
  }

  /** Config in effect for one entity type and extraction process, without requiring the engine to
   * be started. Defaults to this client's own mode. */
  public async getMergedConfigForType(
    type: EntityType,
    extractionMode: ExtractionMode = this.extractionMode
  ): Promise<MergedLogExtractionConfig> {
    const [globalOverrides, engineDescriptor] = await Promise.all([
      this.globalStateClient.findLogExtractionOverrides(),
      this.engineDescriptorClient.findOrThrow(type),
    ]);
    return getMergedConfig(
      type,
      globalOverrides,
      engineDescriptor.logExtractionConfig,
      extractionMode,
      extractionMode === EXTRACTION_MODE.nonPriority
        ? engineDescriptor.nonPriorityLogExtractionConfig
        : undefined
    );
  }

  public async extractLogs(
    type: EntityType,
    opts?: LogsExtractionOptions
  ): Promise<ExtractedLogsSummary> {
    this.logger.debug('starting entity extraction');

    let isRemote = false;
    // Where this run resumes from, captured before any work so the error path can still report
    // lag. Stays undefined when the engine is stopped or the non-priority process is disabled,
    // because neither is stalled — they are idle, and an idle process must not report lag.
    // Note: this is the raw cursor before applyMaxLagCutoff clips it. In the rare case where
    // the checkpoint is older than lookbackPeriod AND the run fails, the error-path lag is
    // overstated (raw age vs. effective search distance). An alert still fires correctly; only
    // the number is larger than the cutoff distance. The success path is accurate in all cases.
    let resumePointISO: string | undefined;
    // Updated whenever a checkpoint is persisted mid-run; the error path uses the most-recent
    // committed point rather than the pre-run start, so partial progress does not inflate the
    // reported lag.
    let lastPersistedCheckpointISO: string | undefined;

    try {
      const { config, engineState } = await this.getLogExtractionConfigAndState(type);
      ({ fromDateISO: resumePointISO } = resolveMainExtractionWindow({ config, engineState }));
      const entityDefinition = getEntityDefinition(type, this.namespace, this.extractionMode);
      const {
        count,
        pages,
        indexPatterns,
        lastSearchTimestamp,
        logsCapDeferred,
        logsCapApplied,
        logsProcessed,
      } = await this.runQueryAndIngestDocs({
        type,
        config,
        engineState,
        opts,
        entityDefinition,
        onRemoteResolved: (r) => {
          isRemote = r;
        },
        onCheckpointPersisted: (ts) => {
          lastPersistedCheckpointISO = ts;
        },
      });

      const operationResult = {
        success: true as const,
        isRemote,
        count,
        pages,
        scannedIndices: indexPatterns,
        lastSearchTimestamp,
        logsCapApplied,
        logsProcessed,
      };

      if (opts?.specificWindow) {
        return operationResult;
      }

      const nextResumePointISO = lastSearchTimestamp || moment().utc().toISOString();

      if (logsCapDeferred) {
        // Cursor is already persisted at the last completed slice end inside runMainExtractionLoop;
        // do not overwrite it — only clear any stale error.
        await this.engineDescriptorClient.update(type, this.errorPatch(null));
      } else {
        await this.engineDescriptorClient.update(type, {
          ...this.extractionStatePatch({
            checkpointTimestamp: null,
            paginationId: null,
            lastExecutionTimestamp: nextResumePointISO,
            sliceEndTimestamp: null,
          }),
          ...this.errorPatch(null),
        });
      }

      this.recordExtractionLag(nextResumePointISO, this.getExtractionAttributes(type, isRemote));

      return operationResult;
    } catch (error) {
      // Skipped for a manual window, matching the success path: a force run neither reads nor
      // advances the scheduled cursor, so its outcome says nothing about how far behind the
      // engine is.
      if (!opts?.specificWindow) {
        // Use the most-recently committed checkpoint if the run made partial progress: it is closer
        // to where the next run will resume than the pre-run start and avoids inflating the lag
        // alert when a long run fails after several completed slices.
        this.recordExtractionLag(
          lastPersistedCheckpointISO ?? resumePointISO,
          this.getExtractionAttributes(type, isRemote)
        );
      }
      return await this.handleError(error, type, isRemote);
    }
  }

  /**
   * Distance between now and the point the next run resumes from, recorded once per run — on
   * success, on a deferred cap, and on failure — so a process that stalls without erroring is
   * still visible. This is the priority process's only warning signal: its `defer` cap behavior
   * holds the cursor instead of dropping logs, so it falls behind silently.
   *
   * Reads the resume point rather than `checkpointTimestamp`, which a completed run nulls out.
   * Clamped at 0 against clock skew putting the resume point in the future.
   */
  private recordExtractionLag(
    resumePointISO: string | undefined,
    metricAttributes: ExtractionAttributes
  ): void {
    if (!resumePointISO) return;
    entityStoreMetrics.extractionLagMs.record(
      Math.max(0, Date.now() - new Date(resumePointISO).getTime()),
      metricAttributes
    );
  }

  public async updateConfig(params?: LogExtractionInstallParams): Promise<LogExtractionConfig> {
    const state = await this.globalStateClient.update({ logsExtraction: params });
    return state.logsExtraction;
  }

  private async runQueryAndIngestDocs({
    type,
    config,
    engineState,
    opts,
    entityDefinition,
    onRemoteResolved,
    onCheckpointPersisted,
  }: {
    type: EntityType;
    config: MergedLogExtractionConfig;
    engineState: EngineLogExtractionState;
    opts?: LogsExtractionOptions;
    entityDefinition: GatedEntityDefinition<ManagedEntityDefinition>;
    // Called once remote patterns are resolved and before any fallible work begins, so the caller
    // can propagate the flag even when runMainPath or a subsequent step throws.
    onRemoteResolved?: (isRemote: boolean) => void;
    // Called after each checkpoint write so the caller tracks partial progress for lag reporting.
    onCheckpointPersisted?: (ts: string) => void;
  }): Promise<{
    isRemote: boolean;
    count: number;
    pages: number;
    indexPatterns: string[];
    lastSearchTimestamp: string;
    logsCapDeferred: boolean;
    logsCapApplied: boolean;
    logsProcessed: number;
  }> {
    const { localIndexPatterns, remoteIndexPatterns } = await this.getLocalAndRemoteIndexPatterns(
      config.additionalIndexPatterns,
      config.excludedIndexPatterns
    );

    // ES|QL cannot query remote views (CPS/CCS). Exclude `$.*` on origin and on
    // every remote cluster alias (`*:-$.*`) without naming linked projects.
    const allIndexPatterns = withInternalEsqlViewExclusions([
      ...localIndexPatterns,
      ...remoteIndexPatterns,
    ]);

    const isRemote = remoteIndexPatterns.length > 0;
    onRemoteResolved?.(isRemote);

    const mainResult = await this.runMainPath({
      type,
      config,
      engineState,
      opts,
      entityDefinition,
      latestIndex: await resolveLatestEntitiesIndexName(this.esClient, this.namespace),
      indexPatterns: allIndexPatterns,
      metricAttributes: this.getExtractionAttributes(type, isRemote),
      onCheckpointPersisted,
    });

    return {
      ...mainResult,
      isRemote,
      indexPatterns: allIndexPatterns,
    };
  }

  /**
   * Main-path dispatcher: a manual `specificWindow` runs the extraction loop once with the
   * supplied bounds; a scheduled run walks the time window as a sequence of capped sub-windows.
   *
   * Sub-window loop (scheduled runs): bounds probe cost in lagging environments by limiting
   * each iteration's WHERE-clause to `maxTimeWindowSize` of data. After each iteration the
   * cursor state is cleared and `lastExecutionTimestamp` advances to the sub-window end so a
   * crash between sub-windows resumes correctly on the next scheduled run.
   */
  private async runMainPath({
    type,
    config,
    engineState,
    opts,
    entityDefinition,
    indexPatterns,
    latestIndex,
    metricAttributes,
    onCheckpointPersisted,
  }: {
    type: EntityType;
    config: MergedLogExtractionConfig;
    engineState: EngineLogExtractionState;
    opts?: LogsExtractionOptions;
    entityDefinition: GatedEntityDefinition<ManagedEntityDefinition>;
    indexPatterns: string[];
    latestIndex: string;
    metricAttributes: ExtractionAttributes;
    onCheckpointPersisted?: (ts: string) => void;
  }): Promise<{
    count: number;
    pages: number;
    indexPatterns: string[];
    lastSearchTimestamp: string;
    logsCapDeferred: boolean;
    logsCapApplied: boolean;
    logsProcessed: number;
  }> {
    const { docsLimit, maxLogsPerPage, maxLogsPerWindow, maxLogsPerWindowCapBehavior } = config;
    const samplingRateOverride = config.samplingRate;

    if (opts?.specificWindow) {
      const { fromDateISO, toDateISO } = opts.specificWindow;
      validateExtractionWindow(fromDateISO, toDateISO);
      const result = await this.runMainExtractionLoop({
        type,
        engineState,
        opts,
        indexPatterns,
        latestIndex,
        fromDateISO,
        toDateISO,
        docsLimit,
        maxLogsPerPage,
        maxLogsPerWindow,
        entityDefinition,
        windowEndISO: toDateISO,
        processedLogsBefore: 0,
        samplingRateOverride,
        metricAttributes,
        onCheckpointPersisted,
      });
      let { lastSearchTimestamp } = result;
      if (result.logsCapApplied) {
        this.logger.warn(
          `Entity extraction volume cap reached for entity type "${type}": processed ${result.logsProcessed} logs (limit: ${maxLogsPerWindow}). Cap behavior: "${maxLogsPerWindowCapBehavior}". This is a manual (force) run — cursor is not persisted.`
        );
        entityStoreMetrics.extractionLogsCapApplied.add(1, {
          ...metricAttributes,
          behavior: maxLogsPerWindowCapBehavior,
        });
        if (maxLogsPerWindowCapBehavior === 'drop') {
          lastSearchTimestamp = toDateISO;
        }
      }
      entityStoreMetrics.extractionLogsProcessed.record(result.logsProcessed, metricAttributes);
      this.recordLogsCapUtilization(result.logsProcessed, maxLogsPerWindow, metricAttributes);
      return {
        ...result,
        lastSearchTimestamp,
        indexPatterns,
        logsCapDeferred: false,
        logsCapApplied: result.logsCapApplied,
      };
    }

    const { fromDateISO: resolvedFromDateISO, effectiveWindowEnd } = resolveMainExtractionWindow({
      config,
      engineState,
    });
    // Surface clock skew / corrupted state loudly if the persisted resume point is in the future.
    validateExtractionWindow(resolvedFromDateISO, effectiveWindowEnd);

    const initialFromDateISO = applyMaxLagCutoff({
      fromDateISO: resolvedFromDateISO,
      effectiveWindowEnd,
      lookbackPeriod: config.lookbackPeriod,
      frequency: config.frequency,
      logger: this.logger,
    });

    let currentFromDateISO = initialFromDateISO;
    // Recovery cursors on the engine state apply only to the first sub-window of this run; once
    // it completes, subsequent sub-windows iterate over fresh time ranges and must not re-trigger
    // entity-page recovery from a stale paginationId.
    let currentEngineState = engineState;
    let totalCount = 0;
    let totalPages = 0;
    let totalLogs = 0;
    let lastSubWindowEnd = currentFromDateISO;
    let sampledAnySubWindow = false;

    let hasNextPage = true;
    while (hasNextPage) {
      if (opts?.signal?.aborted) {
        break;
      }
      if (currentFromDateISO >= effectiveWindowEnd) {
        break;
      }

      const { toDateISO, isCapped } = capExtractionWindowEnd({
        fromDateISO: currentFromDateISO,
        effectiveWindowEnd,
        maxTimeWindowSize: config.maxTimeWindowSize,
        logger: this.logger,
      });

      // Pass remaining budget into the inner loop so that cross-sub-window accumulation is
      // tracked correctly: remaining=0 means no cap (maxLogsPerWindow=0 disabled).
      const remainingCap = maxLogsPerWindow > 0 ? maxLogsPerWindow - totalLogs : 0;
      const subResult = await this.runMainExtractionLoop({
        type,
        engineState: currentEngineState,
        opts,
        indexPatterns,
        latestIndex,
        fromDateISO: currentFromDateISO,
        toDateISO,
        docsLimit,
        maxLogsPerPage,
        maxLogsPerWindow: remainingCap,
        entityDefinition,
        // Sampling projects density to the end of the whole run's window, not the sub-window.
        windowEndISO: effectiveWindowEnd,
        processedLogsBefore: totalLogs,
        samplingRateOverride,
        metricAttributes,
        onCheckpointPersisted,
      });

      totalCount += subResult.count;
      totalPages += subResult.pages;
      totalLogs += subResult.logsProcessed;
      lastSubWindowEnd = subResult.lastSearchTimestamp;
      sampledAnySubWindow = sampledAnySubWindow || subResult.sampledAnySlice;

      if (subResult.logsCapApplied) {
        this.logger.warn(
          `Entity extraction volume cap reached for entity type "${type}": processed ${totalLogs} logs (limit: ${maxLogsPerWindow}). Cap behavior: "${maxLogsPerWindowCapBehavior}".`
        );
        entityStoreMetrics.extractionLogsCapApplied.add(1, {
          ...metricAttributes,
          behavior: maxLogsPerWindowCapBehavior,
        });
        if (maxLogsPerWindowCapBehavior === 'drop') {
          this.logger.warn(
            `Dropping remaining logs in window. Advancing cursor to end of window: ${effectiveWindowEnd}.`
          );
          lastSubWindowEnd = effectiveWindowEnd;
        } else {
          this.logger.warn(
            `Deferring remaining logs in window. Task will resume from last processed position on next run.`
          );
        }
        entityStoreMetrics.extractionLogsProcessed.record(totalLogs, metricAttributes);
        this.recordLogsCapUtilization(totalLogs, maxLogsPerWindow, metricAttributes);
        this.recordSampleEligibleRun(type, sampledAnySubWindow, metricAttributes);
        return {
          count: totalCount,
          pages: totalPages,
          indexPatterns,
          lastSearchTimestamp: lastSubWindowEnd,
          logsCapDeferred: maxLogsPerWindowCapBehavior === 'defer',
          logsCapApplied: true,
          logsProcessed: totalLogs,
        };
      }

      // if the window was capped we consider we have a next page
      hasNextPage = isCapped;
      currentFromDateISO = toDateISO;
      currentEngineState = FRESH_ENGINE_LOG_EXTRACTION_STATE;
    }

    entityStoreMetrics.extractionLogsProcessed.record(totalLogs, metricAttributes);
    this.recordLogsCapUtilization(totalLogs, maxLogsPerWindow, metricAttributes);
    this.recordSampleEligibleRun(type, sampledAnySubWindow, metricAttributes);
    return {
      count: totalCount,
      pages: totalPages,
      indexPatterns,
      lastSearchTimestamp: lastSubWindowEnd,
      logsCapDeferred: false,
      logsCapApplied: false,
      logsProcessed: totalLogs,
    };
  }

  /**
   * Counts scheduled runs of a sampling-capable non-priority process, labeled by whether any
   * slice sampled. Other processes and types never record, so sampled/total reads directly as
   * the share of eligible runs that sampled.
   */
  private recordSampleEligibleRun(
    type: EntityType,
    sampled: boolean,
    metricAttributes: ExtractionAttributes
  ): void {
    if (this.extractionMode !== EXTRACTION_MODE.nonPriority || !supportsNonPrioritySampling(type)) {
      return;
    }
    entityStoreMetrics.extractionSampleEligibleRuns.add(1, { ...metricAttributes, sampled });
  }

  /**
   * Fraction of the volume cap this run consumed. `maxLogsPerWindow` of 0 disables the cap, so
   * there is no fraction to report: recording 0 there would be indistinguishable from an idle
   * process. Clamped at 1 because a resumed mid-slice run starts with a fresh budget and can
   * process more than one budget in total.
   */
  private recordLogsCapUtilization(
    logsProcessed: number,
    maxLogsPerWindow: number,
    metricAttributes: ExtractionAttributes
  ): void {
    if (maxLogsPerWindow <= 0) return;
    entityStoreMetrics.extractionLogsCapUtilization.record(
      Math.min(1, logsProcessed / maxLogsPerWindow),
      metricAttributes
    );
  }

  /**
   * Main LOOKUP extraction: outer loop over capped raw-log slices, inner loop over entity pages per slice.
   */
  private async runMainExtractionLoop({
    type,
    engineState: initialEngineState,
    opts,
    indexPatterns,
    latestIndex,
    fromDateISO,
    toDateISO,
    docsLimit,
    maxLogsPerPage,
    maxLogsPerWindow,
    entityDefinition,
    windowEndISO,
    processedLogsBefore = 0,
    samplingRateOverride,
    metricAttributes,
    onCheckpointPersisted,
  }: {
    type: EntityType;
    engineState: EngineLogExtractionState;
    opts?: LogsExtractionOptions;
    indexPatterns: string[];
    latestIndex: string;
    fromDateISO: string;
    toDateISO: string;
    docsLimit: number;
    maxLogsPerPage: number;
    maxLogsPerWindow: number;
    entityDefinition: GatedEntityDefinition<ManagedEntityDefinition>;
    /** End of the whole run's window, used to project remaining volume for sampling. */
    windowEndISO: string;
    /** Logs already counted against the run's budget by earlier sub-windows. */
    processedLogsBefore?: number;
    samplingRateOverride?: number | null;
    metricAttributes: ExtractionAttributes;
    onCheckpointPersisted?: (ts: string) => void;
  }) {
    const effectiveMaxLogsPerPage = capAtMaxLogsPerWindow(maxLogsPerPage, maxLogsPerWindow);
    const effectiveDocsLimit = capAtMaxLogsPerWindow(docsLimit, maxLogsPerWindow);
    // Escalates above the target probability (up to an exact, unsampled probe) once
    // maxLogsPerPage is too small for the sampling estimator to be accurate — see
    // pickSampleProbability. Computed once per loop invocation: effectiveMaxLogsPerPage is
    // fixed for the whole loop.
    const effectiveSampleProbability = pickSampleProbability(effectiveMaxLogsPerPage);
    // Sampling policy: only the non-priority process of a capability-declaring type may sample.
    const samplingEligible =
      this.extractionMode === EXTRACTION_MODE.nonPriority && supportsNonPrioritySampling(type);
    let totalCount = 0;
    let totalLogs = 0;
    let pages = 0;
    let logsCapApplied = false;
    let logsCapTimestamp: string | undefined;
    let sampledAnySlice = false;
    let state: EngineLogExtractionState = { ...initialEngineState };

    const onAbort = () => {
      this.logger.debug('Aborting execution mid logs extraction');
      entityStoreMetrics.extractionTaskAborted.add(1, metricAttributes);
    };
    opts?.signal?.addEventListener('abort', onAbort);

    // Mid-slice resume cursors from a prior interrupted run; consumed by the first outer
    // iteration only, which re-enters the interrupted slice with its exact persisted bounds.
    const { resumeEntityPagination, resumeSliceEnd, resumeSamplingRate } =
      this.resolveMidSliceResume(initialEngineState, fromDateISO);

    try {
      let lastLogsPages = false;
      /** First outer iteration of this `extractLogs` run: run the boundary probe from the time window only, not the persisted log-slice start. */
      let isFirstRunInThisCycle = true;
      do {
        // always find a new cursor via probe on first run
        const logsPageCursorStart = isFirstRunInThisCycle
          ? undefined
          : paginationFromOptionalFields(state.checkpointTimestamp);

        let logsPageCursorEnd: LogSlicePaginationParams;
        let entityPagination: PaginationParams | undefined;
        let bumpedCursorEnd: LogSlicePaginationParams | null = null;
        let sliceLogCount = 0;
        const isResumingMidSlice = isFirstRunInThisCycle && resumeSliceEnd !== undefined;

        if (isFirstRunInThisCycle && resumeSliceEnd) {
          // Re-enter the interrupted slice with its exact persisted bounds, skipping the probe:
          // the sampled probe is not deterministic, so a re-drawn boundary would strand logs of
          // already-paged entities between the old and new slice end. The slice's log volume was
          // counted by the interrupted run, so it does not count against this run's cap.
          // Note: maxLogsPerWindow caps volume per task execution, not per time window - a
          // resumed execution starts with a fresh budget, so a time window that was interrupted
          // mid-run can consume more than one budget in total.
          logsPageCursorEnd = resumeSliceEnd;
          entityPagination = resumeEntityPagination;
          lastLogsPages = false;
        } else {
          const probe = await this.runLogPaginationCursorProbeForNextPage({
            indexPatterns,
            type,
            entityDefinition,
            fromDateISO,
            toDateISO,
            logsPageCursorStart,
            maxLogsPerPage: effectiveMaxLogsPerPage,
            sampleProbability: effectiveSampleProbability,
            opts,
            metricAttributes,
          });

          if (!probe.hasLogsToProcess && effectiveSampleProbability >= 1) {
            // Sampling wasn't active for this probe (maxLogsPerPage was too small — see
            // pickSampleProbability), so an empty, exact result is definitive: no real docs
            // remain. Stop immediately rather than running a redundant sweep extraction.
            break;
          }

          lastLogsPages = probe.isLastLogsPage;

          if (probe.hasLogsToProcess && !probe.isLastLogsPage) {
            logsPageCursorEnd = probe.logsPaginationCursor;
          } else {
            // if the probe doesn't have more pages to process
            // we keep the natural end of the window as the end cursor
            // This is important because on low document count
            // a sampled probe may return 0 documents. We need to still
            // do a final extraction with the effective end of the window
            // to ensure we don't miss any documents that may have been missed by the probe.
            logsPageCursorEnd = { timestampCursor: toDateISO };
          }

          bumpedCursorEnd = this.detectLogSliceStall(
            logsPageCursorStart,
            logsPageCursorEnd,
            !lastLogsPages,
            effectiveMaxLogsPerPage
          );
          // Only read on the non-bumped path below: a stalled (bumped) slice is dropped, so it
          // never counts against the volume cap.
          sliceLogCount = probe.sliceLogCount;
        }

        if (bumpedCursorEnd) {
          logsPageCursorEnd = bumpedCursorEnd;
          entityStoreMetrics.extractionLogsPerPageDropped.add(1, metricAttributes);
        } else {
          // p = 1 is not passed on: no SAMPLE stage and raw accounting.
          let samplingRate: number | undefined;
          if (isResumingMidSlice) {
            // The probe is skipped on resume, leaving sliceLogCount at 0 - recomputing here would
            // wrongly read that as "nothing left" and drop the sample. Reuse the rate pinned
            // before the interruption instead.
            samplingRate = resumeSamplingRate ?? undefined;
          } else if (samplingEligible) {
            const rate = resolveSamplingRate(
              {
                scannedLogs: processedLogsBefore + totalLogs,
                sliceLogCount,
                sliceStartISO: logsPageCursorStart?.timestampCursor ?? fromDateISO,
                sliceEndISO: logsPageCursorEnd.timestampCursor,
                windowEndISO,
              },
              samplingRateOverride
            );
            samplingRate = rate < 1 ? rate : undefined;
          }

          // Only applied rates are recorded; unsampled slices record nothing so the histogram's
          // distribution reflects actual sampling, not a stream of 1.0s.
          if (samplingRate !== undefined) {
            sampledAnySlice = true;
            entityStoreMetrics.extractionSampleProbability.record(samplingRate, metricAttributes);
          }

          // The budget counts processed volume, letting it stretch across the whole window.
          totalLogs +=
            samplingRate !== undefined ? Math.round(sliceLogCount * samplingRate) : sliceLogCount;

          const sliceIngestOutcome = await this.ingestEntityPagesWithinCurrentLogPage({
            type,
            opts,
            indexPatterns,
            latestIndex,
            entityDefinition,
            docsLimit: effectiveDocsLimit,
            fromDateISO,
            toDateISO,
            logsPageCursorStart,
            logsPageCursorEnd,
            entityPagination,
            state,
            samplingRate,
            metricAttributes,
            onCheckpointPersisted,
          });

          totalCount += sliceIngestOutcome.addedToTotalCount;
          pages += sliceIngestOutcome.addedToPageCount;
          state = sliceIngestOutcome.state;
        }

        state = this.advanceEngineStateAfterLogPageCompletes(state, logsPageCursorEnd);
        await this.persistMainLogExtractionStateIfNotManualWindow(type, opts, state);
        onCheckpointPersisted?.(state.checkpointTimestamp!);
        isFirstRunInThisCycle = false;

        const windowLogCapEnabled = maxLogsPerWindow > 0;
        const windowOverloaded = totalLogs >= maxLogsPerWindow;
        if (!bumpedCursorEnd && windowLogCapEnabled && windowOverloaded) {
          logsCapApplied = true;
          logsCapTimestamp = logsPageCursorEnd.timestampCursor;
          break;
        }
      } while (!lastLogsPages);
    } finally {
      opts?.signal?.removeEventListener('abort', onAbort);
    }

    return {
      count: totalCount,
      pages,
      indexPatterns,
      logsProcessed: totalLogs,
      // When cap fires the caller (runMainPath) applies maxLogsPerWindowCapBehavior to determine the final
      // lastSearchTimestamp; here we report where the loop actually stopped.
      lastSearchTimestamp: logsCapTimestamp ?? toDateISO,
      logsCapApplied,
      sampledAnySlice,
    };
  }

  /**
   * Locates the inclusive upper bound of the next raw-log page (probe ESQL). Runs every outer log-slice iteration.
   */
  private async runLogPaginationCursorProbeForNextPage({
    indexPatterns,
    type,
    entityDefinition,
    fromDateISO,
    toDateISO,
    logsPageCursorStart,
    maxLogsPerPage,
    sampleProbability,
    opts,
    metricAttributes,
  }: {
    indexPatterns: string[];
    type: EntityType;
    entityDefinition: GatedEntityDefinition<ManagedEntityDefinition>;
    fromDateISO: string;
    toDateISO: string;
    logsPageCursorStart: LogSlicePaginationParams | undefined;
    maxLogsPerPage: number;
    sampleProbability: number;
    opts?: LogsExtractionOptions;
    metricAttributes: ExtractionAttributes;
  }): Promise<LogPaginationCursor> {
    const probeStart = Date.now();
    const logPaginationCursorProbeResponse = await executeEsqlQueryRetryingRemoteResources({
      indexPatterns,
      logger: this.logger,
      execute: (patterns) =>
        executeEsqlQuery({
          esClient: this.esClient,
          query: buildLogPaginationCursorProbeEsql({
            indexPatterns: patterns,
            entityDefinition,
            fromDateISO,
            toDateISO,
            logsPageCursorStart,
            maxLogsPerPage,
            sampleProbability,
          }),
          signal: opts?.signal,
          telemetry: {
            name: 'probe_query',
            namespace: this.namespace,
            type,
          },
        }),
    });
    entityStoreMetrics.extractionProbeQueryDurationMs.record(
      Date.now() - probeStart,
      metricAttributes
    );

    const parsedLogPaginationCursor = parseLogPaginationCursorRow(logPaginationCursorProbeResponse);

    const interpretedLogPaginationCursor = interpretLogPaginationCursorRows(
      parsedLogPaginationCursor,
      maxLogsPerPage,
      sampleProbability
    );

    if (parsedLogPaginationCursor) {
      this.logger.debug(
        `Log pagination cursor probe: ${parsedLogPaginationCursor.sliceDocCount} docs in slice, next page ends at ${parsedLogPaginationCursor.logsPaginationCursor.timestampCursor}`
      );
    }

    return interpretedLogPaginationCursor;
  }

  /**
   * Bounded extraction ESQL + ingest for each entity page within one raw-log slice.
   */
  private async ingestEntityPagesWithinCurrentLogPage({
    type,
    opts,
    indexPatterns,
    latestIndex,
    entityDefinition,
    docsLimit,
    fromDateISO,
    toDateISO,
    logsPageCursorStart,
    logsPageCursorEnd,
    entityPagination,
    state: initialSliceState,
    samplingRate,
    metricAttributes,
    onCheckpointPersisted,
  }: {
    type: EntityType;
    opts?: LogsExtractionOptions;
    indexPatterns: string[];
    latestIndex: string;
    entityDefinition: GatedEntityDefinition<ManagedEntityDefinition>;
    docsLimit: number;
    fromDateISO: string;
    toDateISO: string;
    logsPageCursorStart: LogSlicePaginationParams | undefined;
    logsPageCursorEnd: LogSlicePaginationParams;
    entityPagination: PaginationParams | undefined;
    state: EngineLogExtractionState;
    samplingRate?: number;
    metricAttributes: ExtractionAttributes;
    onCheckpointPersisted?: (ts: string) => void;
  }): Promise<{
    addedToTotalCount: number;
    addedToPageCount: number;
    state: EngineLogExtractionState;
  }> {
    let state = initialSliceState;
    let addedToTotalCount = 0;
    let addedToPageCount = 0;

    let pagination = entityPagination;

    do {
      const query = buildLogsExtractionEsqlQuery({
        indexPatterns,
        latestIndex,
        entityDefinition,
        docsLimit,
        fromDateISO,
        toDateISO,
        pagination,
        logsPageCursorStart,
        logsPageCursorEnd,
        samplingRate,
      });

      this.logger.debug(
        `Running query to extract logs from ${fromDateISO} to ${toDateISO} ${
          pagination ? `with entity page cursor: ${pagination.idCursor}` : ''
        }`
      );

      const queryStart = Date.now();
      const esqlResponse = await executeEsqlQuery({
        esClient: this.esClient,
        query,
        signal: opts?.signal,
        telemetry: {
          name: 'extraction_query',
          namespace: this.namespace,
          type,
        },
      });
      entityStoreMetrics.extractionQueryDurationMs.record(
        Date.now() - queryStart,
        metricAttributes
      );

      if (
        esqlResponse._clusters &&
        esqlResponse._clusters.successful !== esqlResponse._clusters.total
      ) {
        const { partial, skipped, successful, total, failed } = esqlResponse._clusters;
        this.logger.warn(
          `Cluster-level partial success during extraction for ${type} in ${this.namespace}: partial=${partial}, failed=${failed}, skipped=${skipped}, successful=${successful}, total=${total}`
        );
      }

      addedToTotalCount += esqlResponse.values.length;
      pagination = extractMainPaginationParams(esqlResponse, docsLimit);
      if (esqlResponse.values.length > 0) {
        addedToPageCount++;
      }

      this.logger.debug(`Found ${esqlResponse.values.length}, ingesting them`);
      const ingestStart = Date.now();
      const { created, updated, noop } = await ingestEntities({
        esClient: this.esClient,
        esqlResponse,
        esIdField: HASHED_ID_FIELD,
        targetIndex: latestIndex,
        logger: this.logger,
        signal: opts?.signal,
        refresh: true,
        onDropped: () => entityStoreMetrics.extractionBulkDropped.add(1, metricAttributes),
      });
      entityStoreMetrics.extractionIngestDurationMs.record(
        Date.now() - ingestStart,
        metricAttributes
      );
      entityStoreMetrics.extractionEntitiesCreated.add(created, metricAttributes);
      entityStoreMetrics.extractionEntitiesUpdated.add(updated, metricAttributes);
      entityStoreMetrics.extractionEntitiesNoop.add(noop, metricAttributes);

      if (pagination) {
        // Pin both slice bounds alongside the entity cursor: the id cursor is only meaningful
        // together with the exact bounds it was created under. The start is pinned explicitly
        // because on the first slice of a first-ever cycle the persisted checkpoint is null and
        // the fallback window start (now - lookbackPeriod) moves between runs; for later slices
        // this equals the checkpoint already, so it is a no-op.
        state = {
          ...state,
          checkpointTimestamp: logsPageCursorStart?.timestampCursor ?? fromDateISO,
          paginationId: pagination.idCursor,
          sliceEndTimestamp: logsPageCursorEnd.timestampCursor,
          // Pinned alongside the slice bounds so a resume reuses this exact rate instead of
          // recomputing one from a probe-less (and therefore zeroed) volume estimate.
          sliceSamplingRate: samplingRate ?? null,
        };
        await this.persistMainLogExtractionStateIfNotManualWindow(type, opts, state);
        onCheckpointPersisted?.(state.checkpointTimestamp!);
      }
    } while (pagination);

    return { addedToTotalCount, addedToPageCount, state };
  }

  /**
   * After all entity pages for a slice: clear the entity cursor, pinned slice end, and pinned
   * sampling rate, and advance the log-slice cursor to the slice end. Clearing the rate matters:
   * left set, a later slice's resume check would misread it as belonging to a still-interrupted
   * slice instead of one that already completed cleanly.
   */
  private advanceEngineStateAfterLogPageCompletes(
    state: EngineLogExtractionState,
    logsPageCursorEnd: LogSlicePaginationParams
  ): EngineLogExtractionState {
    return {
      ...state,
      checkpointTimestamp: logsPageCursorEnd.timestampCursor,
      paginationId: null,
      sliceEndTimestamp: null,
      sliceSamplingRate: null,
    };
  }

  /**
   * Resolves mid-slice resume cursors from persisted state. Both cursors are returned only when
   * the pinned slice end is present: the sampled boundary probe is not deterministic, so resuming
   * an id cursor against a re-drawn slice end would strand the logs of already-paged entities
   * that fall between the old and new boundary.
   */
  private resolveMidSliceResume(
    initialEngineState: EngineLogExtractionState,
    fromDateISO: string
  ): {
    resumeEntityPagination?: PaginationParams;
    resumeSliceEnd?: LogSlicePaginationParams;
    /** Sampling rate pinned for the interrupted slice, reused as-is. `null` means the slice was
     * unsampled; `undefined` (no resume in progress) is handled by the caller checking
     * `resumeSliceEnd` first. */
    resumeSamplingRate?: number | null;
  } {
    const { paginationId, sliceEndTimestamp, sliceSamplingRate } = initialEngineState;
    if (!paginationId) {
      return {};
    }
    if (!sliceEndTimestamp) {
      // An id cursor is only meaningful together with the exact slice bounds it was created
      // under. Without a pinned slice end those bounds cannot be reproduced (the probe is
      // sampled), so discard the cursor and re-process the slice from the checkpoint; upserts
      // are idempotent, so re-processing is safe.
      this.logger.warn(
        `Found a mid-slice entity cursor (${paginationId}) without a pinned slice end. Discarding the cursor and re-processing the slice from ${fromDateISO}.`
      );
      return {};
    }
    this.logger.warn(
      `Resuming mid-slice with entity cursor ${paginationId} and pinned slice end ${sliceEndTimestamp} (window from ${fromDateISO}).`
    );
    return {
      resumeEntityPagination: { idCursor: paginationId },
      resumeSliceEnd: { timestampCursor: sliceEndTimestamp },
      resumeSamplingRate: sliceSamplingRate,
    };
  }

  /**
   * Returns the bumped slice-end cursor when a stall is detected, null otherwise. Logs a
   * warning on stall. `isFullPage` is `true` when the (possibly sampled) probe saturated its
   * limit — i.e. this iteration was not resolved as the last page.
   */
  private detectLogSliceStall(
    sliceStart: LogSlicePaginationParams | undefined,
    sliceEnd: LogSlicePaginationParams,
    isFullPage: boolean,
    effectiveMaxLogsPerPage: number
  ): LogSlicePaginationParams | null {
    if (sliceStart && sliceStart.timestampCursor === sliceEnd.timestampCursor && isFullPage) {
      const bumpedTs = moment(sliceEnd.timestampCursor).add(1, 'ms').toISOString();
      this.logger.warn(
        `Log-slice probe stalled at ${sliceEnd.timestampCursor} with a saturated page; advancing cursor by 1ms. Docs sharing this timestamp beyond the configured per-page limit (${effectiveMaxLogsPerPage}) will be dropped.`
      );
      return { timestampCursor: bumpedTs };
    }
    return null;
  }

  private async persistMainLogExtractionStateIfNotManualWindow(
    type: EntityType,
    opts: LogsExtractionOptions | undefined,
    logExtractionState: Partial<EngineLogExtractionState>
  ): Promise<void> {
    if (opts?.specificWindow) {
      return;
    }
    await this.engineDescriptorClient.update(
      type,
      this.extractionStatePatch(logExtractionState as EngineLogExtractionState)
    );
  }

  private async handleError(
    error: any,
    type: EntityType,
    isRemote: boolean
  ): Promise<ExtractedLogsSummary> {
    if (error instanceof NonPriorityExtractionDisabledError) {
      // Returned unflattened so the caller can tell a switched-off process from a broken one.
      // Collapsing it into a generic Error made every disabled tick look like an extraction
      // failure to the metrics layer.
      return { success: false, isRemote, error };
    }

    if (
      SavedObjectsErrorHelpers.isNotFoundError(error) ||
      error instanceof EntityStoreNotRunningError
    ) {
      return {
        success: false,
        isRemote,
        error: new EntityStoreNotRunningError(`Entity store is not started for type ${type}`),
      };
    }

    await this.engineDescriptorClient.update(
      type,
      this.errorPatch({ message: error.message, action: 'extractLogs' })
    );
    return { success: false, isRemote, error };
  }

  /**
   * Returns local and remote index patterns. Both are passed to the main extraction path;
   * coordinator-mode LOOKUP JOIN handles cross-cluster resolution for remote patterns.
   * Cluster-prefixed patterns (`cluster1:logs-*`) are remote (CCS); unqualified patterns are
   * local (CPS reuses local patterns for linked projects via the coordinator).
   */
  public async getLocalAndRemoteIndexPatterns(
    additionalIndexPatterns: string[] = [],
    excludedIndexPatterns: string[] = []
  ): Promise<{ localIndexPatterns: string[]; remoteIndexPatterns: string[] }> {
    const all = await this.getAllIndexPatternsIncludingRemote(additionalIndexPatterns);
    const alertsIndex = getAlertsIndexName(this.namespace);
    const withoutAlertsOrEsqlViews = all
      .filter((index) => index !== alertsIndex)
      .filter((index) => !isPositiveInternalEsqlViewIndexPattern(index));

    const localIndexPatterns: string[] = [];
    const remoteIndexPatterns: string[] = [];

    withoutAlertsOrEsqlViews.forEach((index) => {
      if (isNonLocalIndexName(index)) {
        remoteIndexPatterns.push(index);
      } else {
        localIndexPatterns.push(index);
      }
    });

    // Pre-flight: find data streams with closed backing indices and build adjustments.
    // Open backing indices must be added as positives BEFORE any negations.
    const { openBackingIndices, negations: closedNegations } = await resolveClosedIndexAdjustments(
      this.esClient,
      localIndexPatterns,
      this.logger
    );
    localIndexPatterns.push(...openBackingIndices);

    // Append after includes: ES negation only subtracts from earlier entries in the same expression.
    // e.g. `logs-*,-logs-proxy-*` excludes proxy logs, but `-logs-proxy-*,logs-*` does not.
    excludedIndexPatterns.forEach((pattern) => {
      if (isNonLocalIndexName(pattern)) {
        remoteIndexPatterns.push(`-${pattern}`);
      } else {
        localIndexPatterns.push(`-${pattern}`);
      }
    });

    // Closed-index negations go last — after all positive includes and user exclusions.
    localIndexPatterns.push(...closedNegations);

    return { localIndexPatterns, remoteIndexPatterns };
  }

  public async getLocalIndexPatterns(
    additionalIndexPatterns: string[] = [],
    excludedIndexPatterns: string[] = []
  ): Promise<string[]> {
    const { localIndexPatterns } = await this.getLocalAndRemoteIndexPatterns(
      additionalIndexPatterns,
      excludedIndexPatterns
    );
    return localIndexPatterns;
  }

  /**
   * Builds the full list of index patterns (additional, security data view),
   * including cluster-prefixed patterns from the data view, without alerts or
   * local/remote splitting applied.
   */
  private async getAllIndexPatternsIncludingRemote(
    additionalIndexPatterns: string[] = []
  ): Promise<string[]> {
    const indexPatterns: string[] = [...additionalIndexPatterns];

    try {
      const secSolDataView = await this.dataViewsService.get(
        getSecuritySolutionDataViewName(this.namespace)
      );
      const secSolIndices = secSolDataView.getIndexPattern().split(',');
      indexPatterns.push(...secSolIndices);
    } catch (error) {
      // Not found is a acceptable state in tests and fresh environments
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        this.logger.warn('Security solution data view not found, defaulting to logs-*');
      } else {
        this.logger.warn(
          'Problems finding security solution data view indices, defaulting to logs-*'
        );
        this.logger.warn(error);
      }

      indexPatterns.push('logs-*');
    }

    return indexPatterns;
  }
}

function paginationFromOptionalFields(ts: string | null): LogSlicePaginationParams | undefined {
  if (ts) {
    return { timestampCursor: ts };
  }
  return undefined;
}
