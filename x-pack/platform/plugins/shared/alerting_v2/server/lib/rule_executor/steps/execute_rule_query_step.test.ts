/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiagnosticResult } from '@elastic/elasticsearch';
import { errors } from '@elastic/elasticsearch';
import { TaskErrorSource } from '@kbn/task-manager-plugin/server';
import { getErrorSource } from '@kbn/task-manager-plugin/server/task_running';
import { coreMock } from '@kbn/core/server/mocks';
import { ExecuteRuleQueryStep } from './execute_rule_query_step';
import {
  collectStreamResults,
  createEsqlResponse,
  createPipelineStream,
  createRuleExecutionInput,
  createRuleResponse,
  createRulePipelineState,
  getStepError,
  mockHelpersEsqlArrowBatches,
  mockHelpersEsqlToArrowReader,
} from '../test_utils';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { createQueryService } from '../../services/query_service/query_service.mock';
import type { DeeplyMockedApi } from '@kbn/core-elasticsearch-client-server-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import { RULE_EXECUTION_COUNTERS } from '../metrics/counters';
import type { EsqlConfig, PluginConfig } from '../../../config';

const DEFAULT_MAX_ALERTS_PER_RUN = 10000;

const createPluginConfigAccessor = (maxAlertsPerRun = DEFAULT_MAX_ALERTS_PER_RUN) => {
  const config: PluginConfig = {
    enabled: true,
    invalidateApiKeysTask: { interval: '5m', removalDelay: '1h' },
    rules: {
      minimumScheduleInterval: '1m',
      maxScheduledPerMinute: 400,
      run: { alerts: { max: maxAlertsPerRun }, query: { maxResponseSize: 50 * 1024 * 1024 } },
    },
    esql: { responseFormat: 'json' },
  };

  return coreMock.createPluginInitializerContext<PluginConfig>(config).config;
};

describe('ExecuteRuleQueryStep', () => {
  let step: ExecuteRuleQueryStep;
  let mockEsClient: DeeplyMockedApi<ElasticsearchClient>;
  let mockLogger: ReturnType<typeof createLoggerService>['mockLogger'];
  let loggerService: ReturnType<typeof createLoggerService>['loggerService'];

  function createStep(
    maxAlertsPerRun?: number,
    responseFormat: EsqlConfig['responseFormat'] = 'json'
  ) {
    ({ loggerService, mockLogger } = createLoggerService());
    const mocks = createQueryService(responseFormat);
    mockEsClient = mocks.mockEsClient;
    return new ExecuteRuleQueryStep(
      mocks.queryService,
      createPluginConfigAccessor(maxAlertsPerRun)
    );
  }

  beforeEach(() => {
    step = createStep();
  });

  it('builds query payload and executes query', async () => {
    mockEsClient.esql.query.mockResolvedValue(
      createEsqlResponse([{ name: 'host.name', type: 'keyword' }], [['host-a']])
    );

    const state = createRulePipelineState({
      rule: createRuleResponse(),
      logger: loggerService,
    });
    const results = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('continue');
    expect(results[0].state.queryPayload).toBeDefined();
    expect(results[0].state.esqlRowBatch).toEqual([{ 'host.name': 'host-a' }]);
    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Executing ES|QL query',
      expect.objectContaining({
        labels: expect.objectContaining({
          rule_id: state.input.ruleId,
          step: 'execute_rule_query',
        }),
      })
    );
    const debugMessage = (mockLogger.debug as jest.Mock).mock.calls[0][0] as string;
    expect(debugMessage).not.toContain('FROM');
    expect(debugMessage).not.toContain('LIMIT');
  });

  it('passes correct parameters to ES client', async () => {
    mockEsClient.esql.query.mockResolvedValue(createEsqlResponse());

    const rule = createRuleResponse();
    const abortController = new AbortController();
    const input = createRuleExecutionInput({ abortSignal: abortController.signal });
    const state = createRulePipelineState({ input, rule });

    await collectStreamResults(step.executeStream(createPipelineStream([state])));

    const expectedQuery =
      rule.query.format === 'standalone'
        ? `${rule.query.breach.query.trimEnd()}\n| LIMIT ${DEFAULT_MAX_ALERTS_PER_RUN}`
        : '';
    expect(mockEsClient.esql.query).toHaveBeenCalledWith(
      expect.objectContaining({ query: expectedQuery, drop_null_columns: true }),
      expect.objectContaining({ signal: abortController.signal })
    );
  });

  it('concatenates base and breach segment for composed format rules', async () => {
    mockEsClient.esql.query.mockResolvedValue(createEsqlResponse());

    const rule = createRuleResponse({
      query: {
        format: 'composed',
        base: 'FROM metrics-* | STATS avg(cpu) BY host.name',
        breach: { segment: 'WHERE avg(cpu) > 0.9' },
      },
    });
    const state = createRulePipelineState({ rule });

    await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(mockEsClient.esql.query).toHaveBeenCalledWith(
      expect.objectContaining({
        query: `FROM metrics-* | STATS AVG(cpu) BY host.name | WHERE AVG(cpu) > 0.9\n| LIMIT ${DEFAULT_MAX_ALERTS_PER_RUN}`,
      }),
      expect.objectContaining({ signal: state.input.executionContext.signal })
    );
  });

  it('runs base with LIMIT for a conditionless composed rule', async () => {
    mockEsClient.esql.query.mockResolvedValue(createEsqlResponse());

    const rule = createRuleResponse({
      query: {
        format: 'composed',
        base: 'FROM metrics-* | STATS avg(cpu) BY host.name',
      },
    });
    const state = createRulePipelineState({ rule });

    await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(mockEsClient.esql.query).toHaveBeenCalledWith(
      expect.objectContaining({
        query: `FROM metrics-* | STATS avg(cpu) BY host.name\n| LIMIT ${DEFAULT_MAX_ALERTS_PER_RUN}`,
      }),
      expect.objectContaining({ signal: state.input.executionContext.signal })
    );
  });

  it('appends the configured alerts max as an ES|QL LIMIT clause', async () => {
    step = createStep(500);
    mockEsClient.esql.query.mockResolvedValue(createEsqlResponse());

    const rule = createRuleResponse({
      query: { format: 'standalone', breach: { query: 'FROM logs-*' } },
    });
    const state = createRulePipelineState({ rule });

    await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(mockEsClient.esql.query).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'FROM logs-*\n| LIMIT 500' }),
      expect.objectContaining({ signal: state.input.executionContext.signal })
    );
  });

  it('appends the configured max even when the rule query already has a smaller LIMIT', async () => {
    step = createStep(500);
    mockEsClient.esql.query.mockResolvedValue(createEsqlResponse());

    const rule = createRuleResponse({
      query: { format: 'standalone', breach: { query: 'FROM logs-* | LIMIT 10' } },
    });
    const state = createRulePipelineState({ rule });

    await collectStreamResults(step.executeStream(createPipelineStream([state])));

    // ES|QL takes the min across multiple LIMIT commands, so the author's
    // smaller LIMIT still wins - appending the configured max is always safe.
    expect(mockEsClient.esql.query).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'FROM logs-* | LIMIT 10\n| LIMIT 500' }),
      expect.objectContaining({ signal: state.input.executionContext.signal })
    );
  });

  it('throws abort error when signal is aborted', async () => {
    const abortController = new AbortController();
    abortController.abort();

    mockEsClient.esql.query.mockRejectedValue(new Error('Request aborted'));

    const state = createRulePipelineState({
      input: createRuleExecutionInput({ abortSignal: abortController.signal }),
      rule: createRuleResponse(),
    });

    await expect(
      collectStreamResults(step.executeStream(createPipelineStream([state])))
    ).rejects.toThrow(/aborted/i);
  });

  it('propagates non-abort errors', async () => {
    mockEsClient.esql.query.mockRejectedValue(new Error('Query execution failed'));

    const state = createRulePipelineState({ rule: createRuleResponse() });

    await expect(
      collectStreamResults(step.executeStream(createPipelineStream([state])))
    ).rejects.toThrow('Query execution failed');
  });

  it('marks ResponseError(400) ES|QL errors as TaskErrorSource.USER', async () => {
    mockEsClient.esql.query.mockRejectedValue(
      new errors.ResponseError({ statusCode: 400 } as DiagnosticResult)
    );

    const state = createRulePipelineState({ rule: createRuleResponse() });

    const error = await getStepError(step, state);

    expect(error).toBeInstanceOf(Error);
    expect(getErrorSource(error!)).toBe(TaskErrorSource.USER);
  });

  it('marks content-length-exceeded errors as TaskErrorSource.USER', async () => {
    // The maxResponseSize guard only fires on the JSON (non-streaming) path, which
    // checks Content-Length; the arrow path uses chunked transfer encoding.
    mockEsClient.esql.query.mockRejectedValue(
      new errors.RequestAbortedError('Response size exceeded the limit (content length: 52428800)')
    );

    const state = createRulePipelineState({ rule: createRuleResponse() });

    const error = await getStepError(step, state);

    expect(error).toBeInstanceOf(Error);
    expect(getErrorSource(error!)).toBe(TaskErrorSource.USER);
  });

  it('does not mark plain ES|QL errors as TaskErrorSource.USER', async () => {
    mockEsClient.esql.query.mockRejectedValue(new Error('ES query failed'));

    const state = createRulePipelineState({ rule: createRuleResponse() });

    const error = await getStepError(step, state);

    expect(error).toBeInstanceOf(Error);
    expect(getErrorSource(error!)).toBeUndefined();
  });

  it('yields rows from query results', async () => {
    mockEsClient.esql.query.mockResolvedValue(
      createEsqlResponse(
        [
          { name: 'host.name', type: 'keyword' },
          { name: 'count', type: 'integer' },
        ],
        [
          ['host-a', 1],
          ['host-b', 2],
        ]
      )
    );

    const state = createRulePipelineState({ rule: createRuleResponse() });
    const results = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('continue');
    expect(results[0].state.esqlRowBatch).toEqual([
      { 'host.name': 'host-a', count: 1 },
      { 'host.name': 'host-b', count: 2 },
    ]);
  });

  it('yields continue with empty esqlRowBatch when query returns no rows', async () => {
    mockEsClient.esql.query.mockResolvedValue(
      createEsqlResponse([{ name: 'host.name', type: 'keyword' }], [])
    );

    const state = createRulePipelineState({ rule: createRuleResponse() });
    const results = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('continue');
    expect(results[0].state.esqlRowBatch).toEqual([]);
    expect(results[0].state.queryPayload).toBeDefined();
  });

  it('halts with state_not_ready when rule is missing from state', async () => {
    const state = createRulePipelineState();

    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(result).toEqual({ type: 'halt', reason: 'state_not_ready', state });
  });

  it('emits rowsReturnedByQuery equal to the row count in the single JSON batch', async () => {
    mockEsClient.esql.query.mockResolvedValue(
      createEsqlResponse([{ name: 'host.name', type: 'keyword' }], [['host-a'], ['host-b']])
    );

    const state = createRulePipelineState({ rule: createRuleResponse() });
    const results = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('continue');

    // @ts-expect-error: meta is present on the result
    expect(results[0].meta?.counters).toEqual({
      [RULE_EXECUTION_COUNTERS.rowsReturnedByQuery]: 2,
    });
  });

  it('emits rowsReturnedByQuery = 0 when the query returns no rows', async () => {
    mockEsClient.esql.query.mockResolvedValue(
      createEsqlResponse([{ name: 'host.name', type: 'keyword' }], [])
    );

    const state = createRulePipelineState({ rule: createRuleResponse() });
    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(result.type).toBe('continue');

    // @ts-expect-error: meta is present on the result
    expect(result.meta?.counters).toEqual({
      [RULE_EXECUTION_COUNTERS.rowsReturnedByQuery]: 0,
    });
  });

  describe('arrow response format', () => {
    beforeEach(() => {
      step = createStep(undefined, 'arrow');
    });

    it('streams via the Arrow reader helper and does not call esql.query', async () => {
      mockHelpersEsqlArrowBatches(mockEsClient, [
        { numRows: 1, rows: [{ 'host.name': 'host-a' }] },
      ]);

      const state = createRulePipelineState({ rule: createRuleResponse() });
      const results = await collectStreamResults(step.executeStream(createPipelineStream([state])));

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('continue');
      expect(results[0].state.esqlRowBatch).toEqual([{ 'host.name': 'host-a' }]);
      expect(mockEsClient.helpers.esql).toHaveBeenCalled();
      expect(mockEsClient.esql.query).not.toHaveBeenCalled();
    });

    it('streams each Arrow batch separately with per-batch rowsReturnedByQuery', async () => {
      mockHelpersEsqlArrowBatches(mockEsClient, [
        { numRows: 2, rows: [{ 'host.name': 'host-a' }, { 'host.name': 'host-b' }] },
        { numRows: 1, rows: [{ 'host.name': 'host-c' }] },
      ]);

      const state = createRulePipelineState({ rule: createRuleResponse() });
      const results = await collectStreamResults(step.executeStream(createPipelineStream([state])));

      expect(results).toHaveLength(2);
      expect(results[0].type).toBe('continue');

      // @ts-expect-error: meta is present on the result
      expect(results[0].meta?.counters).toEqual({
        [RULE_EXECUTION_COUNTERS.rowsReturnedByQuery]: 2,
      });

      expect(results[1].type).toBe('continue');

      // @ts-expect-error: meta is present on the result
      expect(results[1].meta?.counters).toEqual({
        [RULE_EXECUTION_COUNTERS.rowsReturnedByQuery]: 1,
      });
    });

    it('yields continue with empty esqlRowBatch when the reader yields no batches', async () => {
      mockHelpersEsqlArrowBatches(mockEsClient, []);

      const state = createRulePipelineState({ rule: createRuleResponse() });
      const results = await collectStreamResults(step.executeStream(createPipelineStream([state])));

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('continue');
      expect(results[0].state.esqlRowBatch).toEqual([]);
      expect(results[0].state.queryPayload).toBeDefined();
    });

    it('marks ResponseError(400) ES|QL errors as TaskErrorSource.USER', async () => {
      mockHelpersEsqlToArrowReader(
        mockEsClient,
        jest
          .fn()
          .mockRejectedValue(new errors.ResponseError({ statusCode: 400 } as DiagnosticResult))
      );

      const state = createRulePipelineState({ rule: createRuleResponse() });
      const error = await getStepError(step, state);

      expect(error).toBeInstanceOf(Error);
      expect(getErrorSource(error!)).toBe(TaskErrorSource.USER);
    });
  });
});
