/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { RunContext, RunResult } from '@kbn/task-manager-plugin/server/task';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import { getErrorMessage, type RiskScoreDistribution } from '../../common';
import { TasksConfig } from './config';
import { EntityStoreTaskType } from './constants';
import { createAssetManagerClient } from './factories';
import type { EntityStoreCoreSetup } from '../types';
import type { EntityType } from '../../common/domain/definitions/entity_schema';
import { ALL_ENTITY_TYPES } from '../../common/domain/definitions/entity_schema';
import {
  resolveLatestEntitiesIndexName,
  resolveMetadataDataStreamName,
} from '../domain/asset_manager/resolve_entity_store_indices';
import { ENTITY_STORE_STATUS } from '../domain/constants';
import type { GetStatusResult } from '../domain/types';
import {
  ENTITY_STORE_HEALTH_REPORT_EVENT,
  ENTITY_STORE_METADATA_USAGE_EVENT,
  ENTITY_STORE_RESOLUTION_STATE_EVENT,
  ENTITY_STORE_USAGE_EVENT,
  createReportEvent,
  type TelemetryReporter,
} from '../telemetry/events';
import { executeEsqlQuery } from '../infra/elasticsearch/esql';
import { wrapTaskRun } from '../telemetry/traces';
import { shouldDeleteOrphanedEntityStoreTask } from './should_delete_orphaned_task';
import { buildEaExecutionContext, EA_EXECUTION_CONTEXT_NAMES } from './execution_context';

const config = TasksConfig[EntityStoreTaskType.enum.statusReport];

const getStatusReportTaskId = (namespace: string): string => `${config.type}:${namespace}`;

const SOURCE_TERMS_SIZE = 100;
const MISSING_SOURCE = 'unknown';
const OTHER_SOURCE = 'other';

const toSourceKey = (source: string): string => source.replaceAll('.', '__');

const getStoreSize = (
  esClient: ElasticsearchClient,
  index: string,
  entityType: EntityType,
  signal: AbortSignal
) =>
  esClient.count(
    {
      index,
      query: { term: { 'entity.EngineMetadata.Type': entityType } },
    },
    { signal }
  );

interface TermsBucket {
  key?: string | number;
  doc_count?: number;
}

interface EntitySourceAggs {
  sources?: {
    buckets?: TermsBucket[];
    sum_other_doc_count?: number;
  };
}

export interface EntitySourceDistribution {
  sources: Record<string, number>;
}

/** Counts entities of one type by entity.source. Dots in names become __, and overflow is stored under other. */
export const getEntitySourceDistribution = async (
  esClient: ElasticsearchClient,
  index: string,
  entityType: EntityType,
  logger: Logger,
  signal: AbortSignal
): Promise<EntitySourceDistribution> => {
  const sources: Record<string, number> = Object.create(null);
  try {
    const response = await esClient.search<unknown, EntitySourceAggs>(
      {
        index,
        size: 0,
        track_total_hits: false,
        query: { term: { 'entity.EngineMetadata.Type': entityType } },
        aggs: {
          sources: {
            terms: {
              field: 'entity.source',
              size: SOURCE_TERMS_SIZE,
              missing: MISSING_SOURCE,
            },
          },
        },
      },
      { signal }
    );

    const aggregations = response?.aggregations;
    for (const bucket of aggregations?.sources?.buckets ?? []) {
      if (bucket.key !== undefined && typeof bucket.doc_count === 'number') {
        const key = toSourceKey(String(bucket.key));
        sources[key] = (sources[key] ?? 0) + bucket.doc_count;
      }
    }

    const otherCount = aggregations?.sources?.sum_other_doc_count;
    if (typeof otherCount === 'number' && otherCount > 0) {
      sources[OTHER_SOURCE] = (sources[OTHER_SOURCE] ?? 0) + otherCount;
    }

    return { sources };
  } catch (err) {
    logger.warn(
      `Failed to get entity source distribution telemetry for index ${index} and entity type ${entityType}: ${err}`
    );
    return { sources };
  }
};

const RISK_SCORE_FIELDS = {
  base: {
    level: 'entity.risk.calculated_level',
    score: 'entity.risk.calculated_score_norm',
  },
  resolution: {
    level: 'entity.relationships.resolution.risk.calculated_level',
    score: 'entity.relationships.resolution.risk.calculated_score_norm',
  },
} as const;

type RiskScoreKind = keyof typeof RISK_SCORE_FIELDS;

const LEVEL_TO_BAND = {
  Critical: 'critical',
  High: 'high',
  Moderate: 'moderate',
  Low: 'low',
  Unknown: 'unknown',
} as const;

type RiskBand = (typeof LEVEL_TO_BAND)[keyof typeof LEVEL_TO_BAND];

interface EntityScoreAggs {
  bands?: { buckets?: TermsBucket[] };
  scorePercentiles?: { values?: Record<string, number | string | null> };
}

const readPercentile = (
  values: Record<string, number | string | null> | undefined,
  percent: 50 | 90
): number | undefined => {
  const raw = values?.[`${percent}.0`] ?? values?.[String(percent)];
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === 'string') {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
};

/** Counts risk bands and percentiles for one score kind across every entity of one type in the store. */
export const getEntityRiskScoreDistribution = async (
  esClient: ElasticsearchClient,
  index: string,
  entityType: EntityType,
  logger: Logger,
  signal: AbortSignal,
  scoreKind: RiskScoreKind = 'base'
): Promise<RiskScoreDistribution> => {
  try {
    const { level: levelField, score: scoreField } = RISK_SCORE_FIELDS[scoreKind];
    const response = await esClient.search<unknown, EntityScoreAggs>(
      {
        index,
        size: 0,
        track_total_hits: false,
        query: { term: { 'entity.EngineMetadata.Type': entityType } },
        aggs: {
          bands: {
            terms: {
              field: levelField,
              size: 10,
              missing: 'Unknown',
            },
          },
          scorePercentiles: {
            percentiles: {
              field: scoreField,
              percents: [50, 90],
            },
          },
        },
      },
      { signal }
    );

    const distribution: RiskScoreDistribution = {
      critical: 0,
      high: 0,
      moderate: 0,
      low: 0,
      unknown: 0,
    };
    for (const bucket of response?.aggregations?.bands?.buckets ?? []) {
      const level = bucket.key === undefined ? undefined : String(bucket.key);
      const band: RiskBand =
        level !== undefined && level in LEVEL_TO_BAND
          ? LEVEL_TO_BAND[level as keyof typeof LEVEL_TO_BAND]
          : 'unknown';
      if (typeof bucket.doc_count === 'number') {
        distribution[band] = (distribution[band] ?? 0) + bucket.doc_count;
      }
    }

    const normP50 = readPercentile(response?.aggregations?.scorePercentiles?.values, 50);
    const normP90 = readPercentile(response?.aggregations?.scorePercentiles?.values, 90);
    if (normP50 !== undefined) {
      distribution.normP50 = normP50;
    }
    if (normP90 !== undefined) {
      distribution.normP90 = normP90;
    }
    return distribution;
  } catch (err) {
    logger.warn(
      `Failed to get entity risk score ${scoreKind} distribution telemetry for index ${index} and entity type ${entityType}: ${err}`
    );
    return {};
  }
};

export const getResolutionState = async (
  esClient: ElasticsearchClient,
  index: string,
  entityType: EntityType,
  signal: AbortSignal
): Promise<{
  resolvedEntities: number;
  targetEntities: number;
  maxGroupSize: number;
  avgGroupSize: number;
}> => {
  // Target: canonical entity (no `resolved_to`). Alias: entity with `resolved_to` set.
  // Resolution group = one target + its aliases. Query counts aliases only; target via +1 below.
  const query = `FROM ${index}
    | WHERE entity.EngineMetadata.Type == "${entityType}" AND entity.relationships.resolution.resolved_to IS NOT NULL
    | STATS aliasCount = COUNT(*) BY entity.relationships.resolution.resolved_to
    | STATS resolvedEntities = SUM(aliasCount), resolutionGroups = COUNT(*), maxGroupAliases = MAX(aliasCount)`;

  const { columns, values } = await executeEsqlQuery({ esClient, query, signal });

  // No aliases: ES returns null for SUM/MAX; report as 0. Look up by column name, not position.
  const row = values[0] ?? [];
  const readSummaryValue = (columnName: string): number => {
    const idx = columns.findIndex((c) => c.name === columnName);
    const value = idx === -1 ? null : row[idx];
    return typeof value === 'number' ? value : 0;
  };

  const resolvedEntities = readSummaryValue('resolvedEntities');
  // One group per distinct resolution target, so resolutionGroups === targetEntities by construction.
  const targetEntities = readSummaryValue('resolutionGroups');
  // Group size includes the target (+1). avg: (resolvedEntities / targetEntities) + 1 per group.
  const maxGroupSize = targetEntities > 0 ? readSummaryValue('maxGroupAliases') + 1 : 0;
  const avgGroupSize = targetEntities > 0 ? resolvedEntities / targetEntities + 1 : 0;

  return { resolvedEntities, targetEntities, maxGroupSize, avgGroupSize };
};

const toHealthReportPayload = (statusResult: GetStatusResult) => {
  if (statusResult.status === ENTITY_STORE_STATUS.NOT_INSTALLED) {
    return { engines: [] };
  }

  const { engines } = statusResult;

  return {
    engines: engines.map((engine) => ({
      type: engine.type,
      status: engine.status,
      components: (('components' in engine ? engine.components : []) ?? []).map((component) => {
        const normalizedComponent: {
          id: string;
          resource: string;
          installed: boolean;
          status?: string;
          lastError?: string;
        } = {
          id: component.id,
          resource: component.resource,
          installed: component.installed,
        };

        if ('status' in component && typeof component.status === 'string') {
          normalizedComponent.status = component.status;
        }

        if ('lastError' in component && typeof component.lastError === 'string') {
          normalizedComponent.lastError = component.lastError;
        }

        return normalizedComponent;
      }),
    })),
  };
};

async function runTask({
  taskInstance,
  fakeRequest,
  signal,
  logger,
  core,
  telemetryReporter,
}: RunContext & {
  logger: Logger;
  core: EntityStoreCoreSetup;
  telemetryReporter: TelemetryReporter;
}): Promise<RunResult> {
  const namespace = taskInstance.state.namespace as string | undefined;

  if (!namespace) {
    throw new Error('Namespace is required for status report task');
  }

  const [coreStart] = await core.getStartServices();
  if (
    await shouldDeleteOrphanedEntityStoreTask({
      coreStart,
      namespace,
      logger,
    })
  ) {
    return { state: { namespace }, shouldDeleteTask: true };
  }

  if (!fakeRequest) {
    logger.error('No fake request found, skipping status report task');
    return { state: { namespace } };
  }

  const errors: string[] = [];

  const { assetManagerClient, esClient } = await createAssetManagerClient({
    core,
    fakeRequest,
    logger,
    namespace,
    analytics: telemetryReporter,
    isServerless: false,
  });
  const index = await resolveLatestEntitiesIndexName(esClient, namespace);

  // Report Entity Store usage and resolution state per entity type
  await Promise.all(
    ALL_ENTITY_TYPES.map(async (entityType) => {
      try {
        const [
          { count: storeSize },
          { sources },
          baseScoreDistribution,
          resolutionScoreDistribution,
        ] = await Promise.all([
          getStoreSize(esClient, index, entityType, signal),
          getEntitySourceDistribution(esClient, index, entityType, logger, signal),
          getEntityRiskScoreDistribution(esClient, index, entityType, logger, signal, 'base'),
          getEntityRiskScoreDistribution(esClient, index, entityType, logger, signal, 'resolution'),
        ]);
        telemetryReporter.reportEvent(ENTITY_STORE_USAGE_EVENT, {
          storeSize,
          entityType,
          namespace,
          sources,
          baseScoreDistribution,
          resolutionScoreDistribution,
        });

        const { resolvedEntities, targetEntities, maxGroupSize, avgGroupSize } =
          await getResolutionState(esClient, index, entityType, signal);
        const standaloneEntities = Math.max(0, storeSize - resolvedEntities - targetEntities);
        telemetryReporter.reportEvent(ENTITY_STORE_RESOLUTION_STATE_EVENT, {
          entityType,
          namespace,
          totalEntities: storeSize,
          resolvedEntities,
          targetEntities,
          standaloneEntities,
          resolutionGroups: targetEntities,
          avgGroupSize,
          maxGroupSize,
        });
      } catch (e) {
        logger.error(`Error reporting store usage for ${entityType}: ${getErrorMessage(e)}`);
        errors.push(getErrorMessage(e));
      }
    })
  );

  // Report metadata datastream doc count (only present when entity store v2 is enabled)
  try {
    const { count: docCount } = await esClient.count(
      { index: await resolveMetadataDataStreamName(esClient, namespace) },
      { signal }
    );
    telemetryReporter.reportEvent(ENTITY_STORE_METADATA_USAGE_EVENT, { namespace, docCount });
  } catch (e) {
    // Datastream doesn't exist when v2 FF is off — not an error worth surfacing.
    logger.debug(
      `Metadata datastream not present, skipping metadata usage report: ${getErrorMessage(e)}`
    );
  }

  // Report status
  try {
    const statusResult = await assetManagerClient.getStatus(true);
    telemetryReporter.reportEvent(ENTITY_STORE_HEALTH_REPORT_EVENT, {
      namespace,
      ...toHealthReportPayload(statusResult),
    });
  } catch (e) {
    logger.error(`Error reporting entity store health: ${getErrorMessage(e)}`);
    errors.push(getErrorMessage(e));
  }

  if (errors.length > 0) {
    throw new Error(errors.join(', '));
  }

  return { state: { namespace } };
}

export function registerStatusReportTask({
  taskManager,
  logger,
  core,
}: {
  core: EntityStoreCoreSetup;
  taskManager: TaskManagerSetupContract;
  logger: Logger;
}): void {
  try {
    const telemetryReporter = createReportEvent(core.analytics);
    taskManager.registerTaskDefinitions({
      [config.type]: {
        title: config.title,
        timeout: config.timeout,
        createTaskRunner: ({
          taskInstance,
          fakeRequest,
          signal,
          executionUuid,
          setCustomTaskRunEventFields,
        }) => ({
          run: async () => {
            const [coreStart] = await core.getStartServices();
            return coreStart.executionContext.withContext(
              buildEaExecutionContext(
                EA_EXECUTION_CONTEXT_NAMES.ENTITY_STORE_STATUS_REPORT_TASK,
                taskInstance.id
              ),
              () =>
                wrapTaskRun({
                  spanName: 'entityStore.task.status_report.run',
                  namespace: taskInstance.state.namespace,
                  attributes: {
                    'entity_store.task.id': taskInstance.id,
                  },
                  run: () =>
                    runTask({
                      taskInstance,
                      fakeRequest,
                      signal,
                      executionUuid,
                      setCustomTaskRunEventFields,
                      logger: logger.get(taskInstance.id),
                      core,
                      telemetryReporter,
                    }),
                })
            );
          },
        }),
      },
    });
  } catch (e) {
    logger.error(`Error registering status report task: ${getErrorMessage(e)}`);
    throw e;
  }
}

export async function scheduleStatusReportTask({
  logger,
  taskManager,
  namespace,
  request,
}: {
  logger: Logger;
  taskManager: TaskManagerStartContract;
  namespace: string;
  request: KibanaRequest;
}): Promise<void> {
  try {
    await taskManager.ensureScheduled(
      {
        id: getStatusReportTaskId(namespace),
        taskType: config.type,
        schedule: { interval: config.interval },
        state: { namespace },
        params: {},
      },
      { request }
    );
  } catch (e) {
    logger.error(`Error scheduling status report task: ${getErrorMessage(e)}`);
    throw e;
  }
}

export async function stopStatusReportTask({
  taskManager,
  logger,
  namespace,
}: {
  taskManager: TaskManagerStartContract;
  logger: Logger;
  namespace: string;
}): Promise<void> {
  const taskId = getStatusReportTaskId(namespace);
  await taskManager.removeIfExists(taskId);
  logger.debug(`Removed status report task: ${taskId}`);
}
