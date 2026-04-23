/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger as PluginLogger, PluginStart } from '@kbn/core-di';
import { CoreStart, Request } from '@kbn/core-di-server';
import type {
  ElasticsearchClient,
  KibanaRequest,
  Logger,
  SavedObjectsServiceStart,
} from '@kbn/core/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { RunContext, RunResult } from '@kbn/task-manager-plugin/server/task';
import type { ServiceIdentifier } from 'inversify';
import { inject, injectable } from 'inversify';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { RulesSavedObjectServiceInternalToken } from '../../services/rules_saved_object_service/tokens';
import type { RulesSavedObjectServiceContract } from '../../services/rules_saved_object_service/rules_saved_object_service';
import { transformRuleSoAttributesToRuleApiResponse } from '../../rules_client/utils';
import { RuleDoctorWorkflowServiceToken } from '../../../workflows/tokens';
import type { RuleDoctorWorkflowService } from '../../../workflows/rule_doctor_workflow';
import type { AlertingServerStartDependencies } from '../../../types';
import { EsServiceInternalToken } from '../../services/es_service/tokens';
import {
  fetchDataViews,
  patternOverlaps,
  fetchStreamNames,
  streamNameMatchesPattern,
  fetchKIsForStream,
  runInlineExtraction,
  type FeatureSummary,
  type DataViewReport,
} from '../../../step_types/discover_features';
import {
  RULE_DOCTOR_COVERAGE_STATE_INDEX,
  type CoverageStateDoc,
  type CoverageStateStatus,
} from '../../../resources/indices/rule_doctor_coverage_state';
import {
  CoverageSettingsProviderToken,
  type CoverageSettingsProvider,
} from './constants';

export interface CoverageInferenceProvider {
  getClient: () => import('@kbn/inference-common').InferenceClient | undefined;
  getDefaultConnectorId: () => Promise<string | undefined>;
}

export const CoverageInferenceProviderToken = Symbol.for(
  'alerting_v2.CoverageInferenceProvider'
) as ServiceIdentifier<CoverageInferenceProvider>;

const BATCH_SIZE = 3;

interface CoverageTaskParams {
  spaceId: string;
}

interface CoverageTaskState {
  runs: number;
  lookbackOverrideHours?: number;
}

interface LatestStateEntry {
  status: CoverageStateStatus;
  timestamp: string;
  executionId: string;
}

type TaskRunParams = Pick<RunContext, 'taskInstance' | 'abortController'>;

@injectable()
export class RuleDoctorCoverageTaskRunner {
  constructor(
    @inject(PluginLogger) private readonly logger: Logger,
    @inject(Request) private readonly request: KibanaRequest,
    @inject(RulesSavedObjectServiceInternalToken)
    private readonly rulesSoService: RulesSavedObjectServiceContract,
    @inject(PluginStart<AlertingServerStartDependencies['spaces']>('spaces'))
    private readonly spaces: SpacesPluginStart,
    @inject(RuleDoctorWorkflowServiceToken)
    private readonly ruleDoctorService: RuleDoctorWorkflowService,
    @inject(CoverageSettingsProviderToken)
    private readonly settingsProvider: CoverageSettingsProvider,
    @inject(CoreStart('savedObjects'))
    private readonly savedObjects: SavedObjectsServiceStart,
    @inject(EsServiceInternalToken)
    private readonly esClient: ElasticsearchClient,
    @inject(CoverageInferenceProviderToken)
    private readonly inferenceProvider: CoverageInferenceProvider
  ) {}

  public async run({ taskInstance, abortController }: TaskRunParams): Promise<RunResult> {
    const state = (taskInstance.state ?? {}) as Partial<CoverageTaskState>;
    const runs = (state.runs ?? 0) + 1;
    const params = taskInstance.params as CoverageTaskParams;
    const spaceId = params.spaceId ?? 'default';

    const { intervalHours, continuous, cadenceMinutes } = await this.loadSettings();

    const signalOverride = await this.consumeRunNowSignal(spaceId);
    const activeOverride = signalOverride ?? state.lookbackOverrideHours;
    const effectiveLookbackHours = activeOverride ?? intervalHours;

    let hasRemainingCandidates = false;
    try {
      hasRemainingCandidates = await this.runStateMachine(
        spaceId,
        effectiveLookbackHours,
        abortController.signal
      );
    } catch (e) {
      this.logger.error(
        `Error executing Rule Doctor coverage analysis task: ${(e as Error).message}`,
        { error: { stack_trace: (e as Error).stack } }
      );
    }

    if (hasRemainingCandidates) {
      this.logger.info('Coverage: candidates remain — rescheduling in 1m to continue');
      return {
        state: { runs, lookbackOverrideHours: activeOverride },
        schedule: { interval: '1m' },
      };
    }

    if (!continuous) {
      this.logger.info('Rule Doctor coverage continuous mode is off; not rescheduling.');
      return { state: { runs } };
    }

    return {
      state: { runs },
      schedule: { interval: `${cadenceMinutes}m` },
    };
  }

  private async runStateMachine(
    spaceId: string,
    effectiveLookbackHours: number,
    signal: AbortSignal
  ): Promise<boolean> {
    const lookbackMs = effectiveLookbackHours * 60 * 60 * 1000;

    // Phase 1: Query state index for latest status per data view
    const latestByPattern = await this.queryLatestStatePerDataView(spaceId);

    const hasInProgress = [...latestByPattern.values()].some((e) => e.status === 'scheduled');
    const hasCandidates = this.hasStaleOrMissingDataViews(latestByPattern, lookbackMs);

    if (!hasInProgress && !hasCandidates) {
      this.logger.debug('Coverage tick: no in-progress or candidate data views — no-op');
      return false;
    }

    // Phase 2: Discover data views and rules
    const namespace = this.spaces.spacesService.spaceIdToNamespace(spaceId);
    const result = await this.rulesSoService.find({
      page: 1,
      perPage: 1000,
      namespaces: namespace ? [namespace] : ['default'],
    });
    const rules = result.saved_objects.map((so) =>
      transformRuleSoAttributesToRuleApiResponse(so.id, so.attributes)
    );
    this.logger.info(`Coverage tick: fetched ${rules.length} rules for space ${spaceId}`);

    const ruleSourcePatterns = this.extractRuleSourcePatterns(rules);
    const allSourcePatterns = new Set(ruleSourcePatterns.values().flatMap((p) => p));

    const soClient = this.savedObjects.getScopedClient(this.request);
    const dataViews = await fetchDataViews(
      soClient,
      this.logger,
      namespace ? [namespace] : ['default']
    );

    if (dataViews.length === 0) {
      this.logger.info('Coverage tick: no data views found');
      return false;
    }

    // Phase 3: Check in-progress executions
    await this.resolveInProgressExecutions(latestByPattern, spaceId);

    // Phase 4: Identify candidates
    const now = Date.now();
    const candidates = dataViews
      .map((dv) => {
        const overlap = [...allSourcePatterns].some((rp) => patternOverlaps(dv.pattern, rp));
        return { ...dv, score: overlap ? 1 : 0 };
      })
      .filter((dv) => {
        const entry = latestByPattern.get(dv.pattern);
        if (!entry) return true;
        if (entry.status === 'scheduled') return false;
        if (entry.status === 'failed') return true;
        return now - new Date(entry.timestamp).getTime() > lookbackMs;
      })
      .sort((a, b) => b.score - a.score);

    this.logger.info(
      `Coverage tick: ${candidates.length} candidates from ${dataViews.length} data views (lookback=${effectiveLookbackHours}h)`
    );

    if (candidates.length === 0) {
      return false;
    }

    // Phase 5: Schedule batch
    const batch = candidates.slice(0, BATCH_SIZE);
    const remaining = candidates.length - batch.length;
    const streamNames = await fetchStreamNames(this.esClient, this.logger);

    let inferenceClient: import('@kbn/inference-common').InferenceClient | undefined;
    let connectorId: string | undefined;
    try {
      connectorId = await this.inferenceProvider.getDefaultConnectorId();
      if (connectorId) {
        inferenceClient = this.inferenceProvider.getClient();
      }
    } catch {
      this.logger.debug('Inference not available — inline extraction disabled for coverage');
    }

    let scheduledCount = 0;
    for (const dv of batch) {
      if (signal.aborted) {
        this.logger.info('Coverage analysis aborted');
        break;
      }

      try {
        const { features, report } = await this.discoverFeaturesForDataView(
          dv,
          streamNames,
          inferenceClient,
          connectorId,
          signal
        );

        const relatedRules = this.filterRulesForDataView(rules, dv.pattern, ruleSourcePatterns);

        this.logger.info(
          `Coverage: ${dv.name} (${dv.pattern}) — ${report.source}, ${features.length} features, ${relatedRules.length}/${rules.length} related rules`
        );

        const executionId = await this.ruleDoctorService.scheduleCoverageAnalysis({
          request: this.request,
          rules: relatedRules,
          spaceId,
          dataView: { name: dv.name, pattern: dv.pattern },
          features,
        });

        await this.writeStateDoc({
          data_view_id: dv.id,
          data_view_name: dv.name,
          data_view_pattern: dv.pattern,
          space_id: spaceId,
          status: 'scheduled',
          execution_id: executionId,
          feature_count: features.length,
          feature_source: report.source,
          related_rule_count: relatedRules.length,
          priority_score: dv.score,
        });
        scheduledCount++;
      } catch (e) {
        this.logger.error(
          `Failed to process coverage for data view ${dv.name}: ${(e as Error).message}`
        );
      }
    }

    this.logger.info(
      `Coverage tick: scheduled ${scheduledCount} workflow executions, ${remaining} candidates remaining`
    );

    return remaining > 0;
  }

  // --- State index helpers ---

  private async queryLatestStatePerDataView(
    spaceId: string
  ): Promise<Map<string, LatestStateEntry>> {
    const map = new Map<string, LatestStateEntry>();

    try {
      const response = await this.esClient.search({
        index: RULE_DOCTOR_COVERAGE_STATE_INDEX,
        size: 0,
        query: {
          bool: {
            filter: [
              { term: { space_id: spaceId } },
              { terms: { status: ['scheduled', 'completed', 'failed'] } },
            ],
          },
        },
        aggs: {
          by_pattern: {
            terms: { field: 'data_view_pattern', size: 500 },
            aggs: {
              latest: {
                top_hits: {
                  size: 1,
                  sort: [{ '@timestamp': { order: 'desc' } }],
                  _source: ['status', '@timestamp', 'execution_id'],
                },
              },
            },
          },
        },
      });

      const buckets = (
        response.aggregations?.by_pattern as {
          buckets: Array<{
            key: string;
            latest: { hits: { hits: Array<{ _source: Record<string, unknown> }> } };
          }>;
        }
      )?.buckets;

      if (buckets) {
        for (const bucket of buckets) {
          const hit = bucket.latest.hits.hits[0]?._source;
          if (hit) {
            map.set(bucket.key, {
              status: hit.status as CoverageStateStatus,
              timestamp: hit['@timestamp'] as string,
              executionId: hit.execution_id as string,
            });
          }
        }
      }
    } catch (e) {
      if ((e as { meta?: { statusCode?: number } }).meta?.statusCode === 404) {
        this.logger.debug('Coverage state index does not exist yet — treating as empty');
      } else {
        throw e;
      }
    }

    return map;
  }

  private async writeStateDoc(
    doc: Omit<CoverageStateDoc, '@timestamp'>
  ): Promise<void> {
    await this.esClient.index({
      index: RULE_DOCTOR_COVERAGE_STATE_INDEX,
      document: {
        '@timestamp': new Date().toISOString(),
        ...doc,
      },
    });
  }

  private async resolveInProgressExecutions(
    latestByPattern: Map<string, LatestStateEntry>,
    spaceId: string
  ): Promise<void> {
    const inProgress = [...latestByPattern.entries()].filter(
      ([, entry]) => entry.status === 'scheduled'
    );

    if (inProgress.length === 0) return;

    this.logger.info(`Coverage tick: checking ${inProgress.length} in-progress executions`);

    for (const [pattern, entry] of inProgress) {
      try {
        const execution = await this.ruleDoctorService.getExecution({
          executionId: entry.executionId,
          spaceId,
        });

        if (!execution) {
          await this.writeStateDoc({
            data_view_id: '',
            data_view_name: '',
            data_view_pattern: pattern,
            space_id: spaceId,
            status: 'failed',
            execution_id: entry.executionId,
            error: 'Execution not found',
          });
          latestByPattern.set(pattern, {
            ...entry,
            status: 'failed',
            timestamp: new Date().toISOString(),
          });
          continue;
        }

        const terminalStatuses = ['completed', 'failed', 'cancelled', 'timed_out', 'skipped'];
        if (terminalStatuses.includes(execution.status)) {
          const succeeded = execution.status === 'completed';
          const findingCount = succeeded ? execution.findings.length : undefined;
          const error = !succeeded
            ? execution.error ?? `Workflow ${execution.status}`
            : undefined;

          await this.writeStateDoc({
            data_view_id: '',
            data_view_name: '',
            data_view_pattern: pattern,
            space_id: spaceId,
            status: succeeded ? 'completed' : 'failed',
            execution_id: entry.executionId,
            finding_count: findingCount,
            error,
          });

          latestByPattern.set(pattern, {
            ...entry,
            status: succeeded ? 'completed' : 'failed',
            timestamp: new Date().toISOString(),
          });

          this.logger.info(
            `Coverage: ${pattern} execution ${entry.executionId} → ${execution.status}${
              findingCount !== undefined ? ` (${findingCount} findings)` : ''
            }`
          );
        }
      } catch (e) {
        this.logger.warn(
          `Failed to check execution ${entry.executionId} for ${pattern}: ${
            (e as Error).message
          }`
        );
      }
    }
  }

  private hasStaleOrMissingDataViews(
    latestByPattern: Map<string, LatestStateEntry>,
    lookbackMs: number
  ): boolean {
    if (latestByPattern.size === 0) return true;
    const now = Date.now();
    for (const entry of latestByPattern.values()) {
      if (entry.status === 'scheduled') continue;
      if (entry.status === 'failed') return true;
      if (now - new Date(entry.timestamp).getTime() > lookbackMs) return true;
    }
    return false;
  }

  private async consumeRunNowSignal(spaceId: string): Promise<number | undefined> {
    try {
      const response = await this.esClient.search({
        index: RULE_DOCTOR_COVERAGE_STATE_INDEX,
        size: 1,
        sort: [{ '@timestamp': 'desc' }],
        query: {
          bool: {
            filter: [
              { term: { status: 'run_now' } },
              { term: { space_id: spaceId } },
            ],
          },
        },
        _source: ['lookback_hours'],
      });

      const hits = response.hits.hits;
      if (hits.length === 0) return undefined;

      const lookbackHours = (hits[0]._source as { lookback_hours?: number })?.lookback_hours ?? 1;

      await this.esClient.deleteByQuery({
        index: RULE_DOCTOR_COVERAGE_STATE_INDEX,
        query: {
          bool: {
            filter: [
              { term: { status: 'run_now' } },
              { term: { space_id: spaceId } },
            ],
          },
        },
        refresh: true,
      });

      this.logger.info(`Coverage: consumed run_now signal (lookback=${lookbackHours}h)`);
      return lookbackHours;
    } catch {
      return undefined;
    }
  }

  // --- Feature discovery (unchanged from original) ---

  private async discoverFeaturesForDataView(
    dv: { name: string; pattern: string },
    streamNames: Set<string>,
    inferenceClient: import('@kbn/inference-common').InferenceClient | undefined,
    connectorId: string | undefined,
    signal: AbortSignal
  ): Promise<{ features: FeatureSummary[]; report: DataViewReport }> {
    let matchedStream: string | undefined;
    for (const sn of streamNames) {
      if (streamNameMatchesPattern(sn, dv.pattern)) {
        matchedStream = sn;
        break;
      }
    }

    if (matchedStream) {
      const kis = await fetchKIsForStream(this.esClient, matchedStream, this.logger);
      if (kis.length > 0) {
        return {
          features: kis,
          report: {
            name: dv.name,
            pattern: dv.pattern,
            source: 'existing_kis',
            stream_name: matchedStream,
            feature_count: kis.length,
          },
        };
      }
    }

    if (inferenceClient && connectorId) {
      try {
        const extracted = await runInlineExtraction(
          this.esClient,
          dv.pattern,
          inferenceClient,
          connectorId,
          signal,
          this.logger
        );
        return {
          features: extracted,
          report: {
            name: dv.name,
            pattern: dv.pattern,
            source: 'inline_extraction',
            stream_name: matchedStream,
            feature_count: extracted.length,
          },
        };
      } catch (err) {
        this.logger.warn(
          `Inline extraction failed for ${dv.pattern}: ${
            err instanceof Error ? err.message : err
          }`
        );
      }
    }

    return {
      features: [],
      report: {
        name: dv.name,
        pattern: dv.pattern,
        source: 'skipped',
        stream_name: matchedStream,
        feature_count: 0,
      },
    };
  }

  private extractRuleSourcePatterns(rules: unknown[]): Map<unknown, string[]> {
    const map = new Map<unknown, string[]>();
    for (const rule of rules) {
      const ruleObj = rule as Record<string, unknown>;
      const evaluation = ruleObj.evaluation as Record<string, unknown> | undefined;
      const query = evaluation?.query as Record<string, unknown> | undefined;
      const baseQuery = query?.base;
      if (typeof baseQuery !== 'string') {
        map.set(rule, []);
        continue;
      }
      const source = getIndexPatternFromESQLQuery(baseQuery);
      map.set(rule, source ? source.split(',') : []);
    }
    return map;
  }

  private filterRulesForDataView(
    rules: unknown[],
    dvPattern: string,
    ruleSourcePatterns: Map<unknown, string[]>
  ): unknown[] {
    return rules.filter((rule) => {
      const patterns = ruleSourcePatterns.get(rule);
      if (!patterns || patterns.length === 0) return false;
      return patterns.some((p) => patternOverlaps(dvPattern, p));
    });
  }

  private async loadSettings(): Promise<{
    intervalHours: number;
    continuous: boolean;
    cadenceMinutes: number;
  }> {
    try {
      return await this.settingsProvider();
    } catch {
      return { intervalHours: 24, continuous: false, cadenceMinutes: 15 };
    }
  }
}
