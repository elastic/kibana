/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { DeeplyMockedApi } from '@kbn/core-elasticsearch-client-server-mocks';
import type { EsqlQueryResponse } from '@elastic/elasticsearch/lib/api/types';
import type {
  PipelineStateStream,
  RuleExecutionInput,
  RuleExecutionStep,
  RulePipelineState,
  StepStreamResult,
} from './rule_executor/types';
import type { RuleResponse } from './rules_client';
import type { QueryPayload } from './rule_executor/get_query_payload';
import type { AlertEvent } from '../resources/datastreams/alert_events';
import type { RuleExecutionPipelineInput } from './rule_executor/execution_pipeline';
import { createExecutionContext } from './execution_context';
import type { RuleSavedObjectAttributes } from '../saved_objects';

/**
 * Creates a mock Elasticsearch client.
 */
export function createMockEsClient(): DeeplyMockedApi<ElasticsearchClient> {
  return elasticsearchServiceMock.createElasticsearchClient();
}

/**
 * Creates a mock SavedObjects client.
 */
export function createMockSavedObjectsClient(): jest.Mocked<SavedObjectsClientContract> {
  return savedObjectsClientMock.create();
}

/**
 * Creates a mock Kibana Logger.
 */
export function createMockLogger(): jest.Mocked<Logger> {
  return loggerMock.create();
}

/**
 * Creates a standard RuleResponse for testing.
 */
export function createRuleResponse(overrides: Partial<RuleResponse> = {}): RuleResponse {
  return {
    id: 'rule-1',
    kind: 'alert',
    metadata: { name: 'test-rule' },
    time_field: '@timestamp',
    schedule: { every: '1m', lookback: '5m' },
    evaluation: {
      query: {
        base: 'FROM logs-* | LIMIT 10',
      },
    },
    grouping: { fields: [] },
    enabled: true,
    createdBy: 'elastic_profile_uid',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedBy: 'elastic_profile_uid',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * Creates standard RuleSavedObjectAttributes for testing.
 */
export function createRuleSoAttributes(
  overrides: Partial<RuleSavedObjectAttributes> = {}
): RuleSavedObjectAttributes {
  return {
    kind: 'alert',
    metadata: { name: 'test-rule' },
    time_field: '@timestamp',
    schedule: { every: '1m', lookback: '5m' },
    evaluation: {
      query: {
        base: 'FROM logs-* | LIMIT 10',
      },
    },
    grouping: { fields: [] },
    enabled: true,
    createdBy: 'elastic_profile_uid',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedBy: 'elastic_profile_uid',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export async function* createRowBatchStream<T>(rows: Array<T>): AsyncIterable<Array<T>> {
  if (rows.length > 0) {
    yield rows;
  }
}

export function createRuleExecutionInput(
  overrides?: Partial<RuleExecutionInput> & { abortSignal?: AbortSignal }
): RuleExecutionInput {
  const abortSignal = overrides?.abortSignal ?? new AbortController().signal;

  return {
    ruleId: 'rule-1',
    spaceId: 'default',
    scheduledAt: '2025-01-01T00:00:00.000Z',
    executionContext: createExecutionContext(abortSignal),
    ...overrides,
  };
}

export function createRuleExecutionPipelineInput(
  overrides: Partial<RuleExecutionPipelineInput> = {}
): RuleExecutionPipelineInput {
  return {
    ruleId: 'rule-1',
    spaceId: 'default',
    scheduledAt: '2025-01-01T00:00:00.000Z',
    abortSignal: new AbortController().signal,
    ...overrides,
  };
}

export function createRulePipelineState(state?: Partial<RulePipelineState>): RulePipelineState {
  return {
    input: createRuleExecutionInput(),
    ...state,
  };
}

export function createPipelineStream(
  states: RulePipelineState[] = [createRulePipelineState()]
): PipelineStateStream {
  return (async function* () {
    for (const state of states) {
      yield { type: 'continue', state };
    }
  })();
}

export async function collectStreamResults(
  stream: PipelineStateStream
): Promise<StepStreamResult[]> {
  const results: StepStreamResult[] = [];
  for await (const result of stream) {
    results.push(result);
  }
  return results;
}

export function createMockStep(
  name: string,
  executeFn: (input: PipelineStateStream) => PipelineStateStream
): RuleExecutionStep {
  return {
    name,
    executeStream: jest.fn(executeFn),
  };
}

export function createQueryPayload(overrides: Partial<QueryPayload> = {}): QueryPayload {
  return {
    filter: { bool: { filter: [] } },
    params: [],
    dateStart: '2024-12-31T23:55:00.000Z',
    dateEnd: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function createEsqlResponse(
  columns: EsqlQueryResponse['columns'] = [{ name: 'host.name', type: 'keyword' }],
  values: EsqlQueryResponse['values'] = [['host-a'], ['host-b']]
): EsqlQueryResponse {
  return {
    columns,
    values,
  };
}

export interface MockArrowBatch {
  numRows: number;
  rows: Array<Record<string, unknown>>;
}

export interface MockArrowReader {
  closed: boolean;
  cancel: jest.Mock<Promise<void>, []>;
  [Symbol.asyncIterator]: () => AsyncIterator<{
    numRows: number;
    toArray: () => Array<{ toJSON: () => Record<string, unknown> }>;
  }>;
}

/**
 * Creates a mock {@link AsyncRecordBatchStreamReader}-shaped object that yields
 * the provided batches when iterated. Marks itself `closed` once iteration
 * completes.
 */
export function createMockArrowReader(batches: MockArrowBatch[]): MockArrowReader {
  const reader: MockArrowReader = {
    closed: false,
    cancel: jest.fn().mockImplementation(async () => {
      reader.closed = true;
    }),
    async *[Symbol.asyncIterator]() {
      for (const batch of batches) {
        yield {
          numRows: batch.numRows,
          toArray: () =>
            batch.rows.map((row) => ({
              toJSON: () => row,
            })),
        };
      }
      reader.closed = true;
    },
  };

  return reader;
}

/**
 * Configures `mockEsClient.helpers.esql(...)` to return an `EsqlHelper`-shaped
 * object whose `toArrowReader` is the provided jest mock. Use this together
 * with {@link createMockArrowReader} to drive `QueryService.executeQueryStream`
 * in tests.
 */
export function mockHelpersEsqlToArrowReader(
  mockEsClient: DeeplyMockedApi<ElasticsearchClient>,
  toArrowReader: jest.Mock
): void {
  (mockEsClient.helpers.esql as unknown as jest.Mock).mockReturnValue({
    toArrowReader,
    toRecords: jest.fn(),
    toArrowTable: jest.fn(),
  });
}

/**
 * Convenience wrapper that wires {@link mockHelpersEsqlToArrowReader} with a
 * reader produced from {@link createMockArrowReader}.
 */
export function mockHelpersEsqlArrowBatches(
  mockEsClient: DeeplyMockedApi<ElasticsearchClient>,
  batches: MockArrowBatch[]
): MockArrowReader {
  const reader = createMockArrowReader(batches);
  mockHelpersEsqlToArrowReader(mockEsClient, jest.fn().mockResolvedValue(reader));
  return reader;
}

export function createAlertEvent(overrides: Partial<AlertEvent> = {}): AlertEvent {
  return {
    '@timestamp': '2025-01-01T00:00:00.000Z',
    scheduled_timestamp: '2025-01-01T00:00:00.000Z',
    rule: { id: 'rule-1', version: 1 },
    group_hash: 'hash-1',
    data: { 'host.name': 'host-a' },
    status: 'breached',
    source: 'internal',
    type: 'signal',
    space_id: 'default',
    ...overrides,
  };
}
