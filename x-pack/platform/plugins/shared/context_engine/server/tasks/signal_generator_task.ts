/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlESQLParams } from '@elastic/elasticsearch/lib/api/types';
import { schema } from '@kbn/config-schema';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { Logger } from '@kbn/logging';
import { isEsqlUnknownIndexError } from '@kbn/storage-adapter';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { TaskCost } from '@kbn/task-manager-plugin/server';
import {
  MANAGEMENT_AGENT_ID,
  SIGNAL_GENERATOR_SCHEDULE_INTERVAL,
  SIGNAL_GENERATOR_TASK_ID,
  SIGNAL_GENERATOR_TASK_TYPE,
} from '../../common/constants';
import type { ToolCallSignal } from '../../common/http_api/signals';
import type { SignalsServiceApi } from '../signals/service';
import { build } from './transform';
import type { AgentInfo, ExecuteToolSpan } from './transform';
import { classify } from './classify';

const MAX_ROWS_PER_QUERY = 1000;

const TRACES_INDEX_PREFIX = 'traces-agent_builder.otel-';
const TRACES_INDEX_PATTERN = `${TRACES_INDEX_PREFIX}*`;
const BACKING_INDEX_PREFIX = '.ds-';
const GENERATIONAL_SUFFIX = /-\d{4}\.\d{2}\.\d{2}-\d{6}$/;

const stateSchemaV1 = schema.object({
  watermark: schema.maybe(schema.string()),
});

export interface SignalGeneratorTaskState {
  watermark?: string;
  [key: string]: unknown;
}

/** Derives the Kibana space from a traces span's `_index`. */
export const spaceFromTracesIndex = (index: string | undefined | null): string | undefined => {
  if (!index) {
    return undefined;
  }
  const withoutBacking = index.startsWith(BACKING_INDEX_PREFIX)
    ? index.slice(BACKING_INDEX_PREFIX.length)
    : index;
  if (!withoutBacking.startsWith(TRACES_INDEX_PREFIX)) {
    return undefined;
  }
  const space = withoutBacking.slice(TRACES_INDEX_PREFIX.length).replace(GENERATIONAL_SUFFIX, '');
  return space || undefined;
};

const esqlRowsToObjects = <TRow>(response: ESQLSearchResponse): TRow[] => {
  const columns = response.columns ?? [];
  return (response.values ?? []).map((row) => {
    const record: Record<string, unknown> = {};
    row.forEach((value, index) => {
      const name = columns[index]?.name;
      if (name) {
        record[name] = value;
      }
    });
    return record as TRow;
  });
};

const runEsqlQuery = async (
  esClient: ElasticsearchClient,
  query: string,
  signal: AbortSignal,
  params?: EsqlESQLParams
): Promise<ESQLSearchResponse | undefined> => {
  try {
    return (await esClient.esql.query(
      { query, ...(params && params.length > 0 ? { params } : {}) },
      { signal }
    )) as unknown as ESQLSearchResponse;
  } catch (error) {
    if (isEsqlUnknownIndexError(error)) {
      return undefined;
    }
    throw error;
  }
};

interface InvokeAgentSpanRow {
  trace_id: string;
  'attributes.gen_ai.conversation.id'?: string | null;
  'attributes.gen_ai.agent.id'?: string | null;
  'attributes.gen_ai.agent.name'?: string | null;
}

interface ToolSpanReadRow extends ExecuteToolSpan {
  _index?: string | null;
}

const queryInvokeAgentSpans = async (
  esClient: ElasticsearchClient,
  traceIds: string[],
  signal: AbortSignal
): Promise<InvokeAgentSpanRow[]> => {
  if (traceIds.length === 0) {
    return [];
  }
  const placeholders = traceIds.map(() => '?').join(', ');
  const query = `
FROM ${TRACES_INDEX_PATTERN}
| WHERE attributes.gen_ai.operation.name == "invoke_agent" AND attributes.elastic.inference.span.kind == "AGENT" AND trace_id IN (${placeholders})
| SORT @timestamp ASC
| LIMIT ${MAX_ROWS_PER_QUERY}
| KEEP trace_id, attributes.gen_ai.conversation.id, attributes.gen_ai.agent.id, attributes.gen_ai.agent.name`;

  const response = await runEsqlQuery(esClient, query, signal, traceIds);
  return response ? esqlRowsToObjects<InvokeAgentSpanRow>(response) : [];
};

const queryExecuteToolSpans = async (
  esClient: ElasticsearchClient,
  watermark: string | undefined,
  signal: AbortSignal
): Promise<ToolSpanReadRow[]> => {
  const query = `
FROM ${TRACES_INDEX_PATTERN} METADATA _index
| WHERE attributes.gen_ai.operation.name == "execute_tool"${
    watermark ? '\n| WHERE @timestamp >= ?watermark' : ''
  }
| SORT @timestamp ASC
| LIMIT ${MAX_ROWS_PER_QUERY}
| KEEP _index, @timestamp, trace_id, span_id, attributes.gen_ai.tool.name, attributes.gen_ai.tool.call.id, attributes.gen_ai.tool.call.arguments, attributes.gen_ai.tool.call.result, duration, status.code, status.message`;

  const response = await runEsqlQuery(
    esClient,
    query,
    signal,
    watermark ? [{ watermark }] : undefined
  );
  return response ? esqlRowsToObjects<ToolSpanReadRow>(response) : [];
};

/** Maps each round id to its `invoke_agent` span's agent identity. */
export const buildConvAgentMap = (rows: InvokeAgentSpanRow[]): Map<string, AgentInfo> => {
  const map = new Map<string, AgentInfo>();
  for (const row of rows) {
    if (!row.trace_id || map.has(row.trace_id)) {
      continue;
    }
    const id = row['attributes.gen_ai.agent.id'] ?? '';
    map.set(row.trace_id, {
      name: row['attributes.gen_ai.agent.name'] ?? '',
      id,
      class: id === MANAGEMENT_AGENT_ID ? 'management' : 'user',
      conversationId: row['attributes.gen_ai.conversation.id'] ?? '',
    });
  }
  return map;
};

const groupRowsBySpace = (
  rows: ToolSpanReadRow[],
  logger: Logger
): Map<string, ExecuteToolSpan[]> => {
  const bySpace = new Map<string, ExecuteToolSpan[]>();
  let skipped = 0;
  let sampleIndex = '';
  for (const row of rows) {
    const spaceId = spaceFromTracesIndex(row._index);
    if (!spaceId) {
      if (skipped === 0) {
        sampleIndex = row._index ?? '';
      }
      skipped += 1;
      continue;
    }
    const existing = bySpace.get(spaceId);
    if (existing) {
      existing.push(row);
    } else {
      bySpace.set(spaceId, [row]);
    }
  }
  if (skipped > 0) {
    logger.warn(
      `Skipping ${skipped} trace span(s) with an unrecognized _index (e.g. '${sampleIndex}')`
    );
  }
  return bySpace;
};

export interface RegisterSignalGeneratorTaskDefinitionDeps {
  taskManager: TaskManagerSetupContract;
  getEsClient: () => ElasticsearchClient;
  getSignalsService: () => SignalsServiceApi;
  getFeedbackLoopEnabled: () => Promise<boolean>;
  logger: Logger;
}

/** Registers the global signal-generator task type. */
export const registerSignalGeneratorTaskDefinition = ({
  taskManager,
  getEsClient,
  getSignalsService,
  getFeedbackLoopEnabled,
  logger,
}: RegisterSignalGeneratorTaskDefinitionDeps): void => {
  taskManager.registerTaskDefinitions({
    [SIGNAL_GENERATOR_TASK_TYPE]: {
      title: 'Context Engine signal generator',
      description:
        'Turns Agent Builder tool-call trace spans into classified Context Engine signals (feedback loop).',
      timeout: '5m',
      maxAttempts: 3,
      cost: TaskCost.Normal,
      stateSchemaByVersion: {
        1: { schema: stateSchemaV1, up: (state) => state },
      },
      createTaskRunner: ({ taskInstance, signal }) => {
        return {
          async run(): Promise<{ state: SignalGeneratorTaskState }> {
            const state = (taskInstance.state ?? {}) as SignalGeneratorTaskState;

            if (!(await getFeedbackLoopEnabled())) {
              return { state };
            }

            const esClient = getEsClient();

            const toolRows = await queryExecuteToolSpans(esClient, state.watermark, signal);
            if (toolRows.length === 0) {
              return { state };
            }

            if (toolRows.length === MAX_ROWS_PER_QUERY) {
              logger.warn(
                `Signal generation read the per-run cap of ${MAX_ROWS_PER_QUERY} tool span(s); a backlog may be accumulating.`
              );
            }

            const traceIds = [
              ...new Set(toolRows.map((row) => row.trace_id).filter((id): id is string => !!id)),
            ];
            const agentRows = await queryInvokeAgentSpans(esClient, traceIds, signal);
            const convAgent = buildConvAgentMap(agentRows);

            let windowMax = '';
            for (const row of toolRows) {
              if (row['@timestamp'] > windowMax) {
                windowMax = row['@timestamp'];
              }
            }

            const rowsBySpace = groupRowsBySpace(toolRows, logger);
            const signalsService = getSignalsService();

            let fullyProcessed = true;
            let total = 0;

            for (const [spaceId, spaceRows] of rowsBySpace) {
              if (signal.aborted) {
                fullyProcessed = false;
                break;
              }
              const signals: ToolCallSignal[] = build({ toolRows: spaceRows, convAgent }).map(
                (produced) => ({ ...produced, tags: classify(produced) })
              );
              try {
                await signalsService.write(spaceId, signals);
                total += signals.length;
              } catch (error) {
                fullyProcessed = false;
                logger.warn(
                  `Failed to write signals for space '${spaceId}': ${
                    error instanceof Error ? error.message : String(error)
                  }`
                );
              }
            }

            logger.debug(
              `Generated ${total} signal(s) across ${rowsBySpace.size} space(s) from ${toolRows.length} tool span(s)`
            );

            return {
              state: { watermark: fullyProcessed ? windowMax || undefined : state.watermark },
            };
          },
        };
      },
    },
  });
};

/** Schedules the global signal-generation task; idempotent. */
export const scheduleSignalGenerator = async ({
  taskManager,
}: {
  taskManager: TaskManagerStartContract;
}): Promise<void> => {
  await taskManager.ensureScheduled({
    id: SIGNAL_GENERATOR_TASK_ID,
    taskType: SIGNAL_GENERATOR_TASK_TYPE,
    schedule: { interval: SIGNAL_GENERATOR_SCHEDULE_INTERVAL },
    params: {},
    state: {},
  });
};
