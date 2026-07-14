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
import type { PluginConfig } from '../../../config';

const DEFAULT_MAX_ALERTS_PER_RUN = 10000;

const createPluginConfigAccessor = (maxAlertsPerRun = DEFAULT_MAX_ALERTS_PER_RUN) => {
  const config: PluginConfig = {
    enabled: true,
    invalidateApiKeysTask: { interval: '5m', removalDelay: '1h' },
    rules: {
      minimumScheduleInterval: '1m',
      maxScheduledPerMinute: 400,
      run: { alerts: { max: maxAlertsPerRun } },
    },
  };

  return coreMock.createPluginInitializerContext<PluginConfig>(config).config;
};

describe('ExecuteRuleQueryStep', () => {
  let step: ExecuteRuleQueryStep;
  let mockEsClient: DeeplyMockedApi<ElasticsearchClient>;

  function createStep(maxAlertsPerRun?: number) {
    const { loggerService } = createLoggerService();
    const mocks = createQueryService();
    mockEsClient = mocks.mockEsClient;
    return new ExecuteRuleQueryStep(
      loggerService,
      mocks.queryService,
      createPluginConfigAccessor(maxAlertsPerRun)
    );
  }

  beforeEach(() => {
    step = createStep();
  });

  it('builds query payload and executes query', async () => {
    mockHelpersEsqlArrowBatches(mockEsClient, [{ numRows: 1, rows: [{ 'host.name': 'host-a' }] }]);

    const state = createRulePipelineState({ rule: createRuleResponse() });
    const results = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('continue');
    expect(results[0].state.queryPayload).toBeDefined();
    expect(results[0].state.esqlRowBatch).toEqual([{ 'host.name': 'host-a' }]);
  });

  it('passes correct parameters to ES client', async () => {
    mockHelpersEsqlArrowBatches(mockEsClient, [{ numRows: 1, rows: [{ 'host.name': 'host-a' }] }]);

    const rule = createRuleResponse();
    const abortController = new AbortController();
    const input = createRuleExecutionInput({ abortSignal: abortController.signal });
    const state = createRulePipelineState({ input, rule });

    await collectStreamResults(step.executeStream(createPipelineStream([state])));

    const expectedQuery =
      rule.query.format === 'standalone'
        ? `${rule.query.breach.query.trimEnd()}\n| LIMIT ${DEFAULT_MAX_ALERTS_PER_RUN}`
        : '';
    expect(mockEsClient.helpers.esql).toHaveBeenCalledWith(
      expect.objectContaining({ query: expectedQuery }),
      expect.objectContaining({ signal: abortController.signal })
    );
  });

  it('concatenates base and breach segment for composed format rules', async () => {
    mockHelpersEsqlArrowBatches(mockEsClient, [{ numRows: 1, rows: [{ 'host.name': 'host-a' }] }]);

    const rule = createRuleResponse({
      query: {
        format: 'composed',
        base: 'FROM metrics-* | STATS avg(cpu) BY host.name',
        breach: { segment: 'WHERE avg(cpu) > 0.9' },
      },
    });
    const state = createRulePipelineState({ rule });

    await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(mockEsClient.helpers.esql).toHaveBeenCalledWith(
      expect.objectContaining({
        query: `FROM metrics-* | STATS AVG(cpu) BY host.name | WHERE AVG(cpu) > 0.9\n| LIMIT ${DEFAULT_MAX_ALERTS_PER_RUN}`,
      }),
      expect.any(Object)
    );
  });

  it('appends the configured alerts max as an ES|QL LIMIT clause', async () => {
    step = createStep(500);
    mockHelpersEsqlArrowBatches(mockEsClient, [{ numRows: 1, rows: [{ 'host.name': 'host-a' }] }]);

    const rule = createRuleResponse({
      query: { format: 'standalone', breach: { query: 'FROM logs-*' } },
    });
    const state = createRulePipelineState({ rule });

    await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(mockEsClient.helpers.esql).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'FROM logs-*\n| LIMIT 500' }),
      expect.any(Object)
    );
  });

  it('appends the configured max even when the rule query already has a smaller LIMIT', async () => {
    step = createStep(500);
    mockHelpersEsqlArrowBatches(mockEsClient, [{ numRows: 1, rows: [{ 'host.name': 'host-a' }] }]);

    const rule = createRuleResponse({
      query: { format: 'standalone', breach: { query: 'FROM logs-* | LIMIT 10' } },
    });
    const state = createRulePipelineState({ rule });

    await collectStreamResults(step.executeStream(createPipelineStream([state])));

    // ES|QL takes the min across multiple LIMIT commands, so the author's
    // smaller LIMIT still wins - appending the configured max is always safe.
    expect(mockEsClient.helpers.esql).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'FROM logs-* | LIMIT 10\n| LIMIT 500' }),
      expect.any(Object)
    );
  });

  it('throws abort error when signal is aborted', async () => {
    const abortController = new AbortController();
    abortController.abort();

    mockHelpersEsqlToArrowReader(
      mockEsClient,
      jest.fn().mockRejectedValue(new Error('Request aborted'))
    );

    const state = createRulePipelineState({
      input: createRuleExecutionInput({ abortSignal: abortController.signal }),
      rule: createRuleResponse(),
    });

    await expect(
      collectStreamResults(step.executeStream(createPipelineStream([state])))
    ).rejects.toThrow(/aborted/i);
  });

  it('propagates non-abort errors', async () => {
    mockHelpersEsqlToArrowReader(
      mockEsClient,
      jest.fn().mockRejectedValue(new Error('Query execution failed'))
    );

    const state = createRulePipelineState({ rule: createRuleResponse() });

    await expect(
      collectStreamResults(step.executeStream(createPipelineStream([state])))
    ).rejects.toThrow('Query execution failed');
  });

  it('marks ResponseError(400) ES|QL errors as TaskErrorSource.USER', async () => {
    mockHelpersEsqlToArrowReader(
      mockEsClient,
      jest.fn().mockRejectedValue(new errors.ResponseError({ statusCode: 400 } as DiagnosticResult))
    );

    const state = createRulePipelineState({ rule: createRuleResponse() });

    const error = await getStepError(step, state);

    expect(error).toBeInstanceOf(Error);
    expect(getErrorSource(error!)).toBe(TaskErrorSource.USER);
  });

  it('does not mark plain ES|QL errors as TaskErrorSource.USER', async () => {
    mockHelpersEsqlToArrowReader(
      mockEsClient,
      jest.fn().mockRejectedValue(new Error('ES query failed'))
    );

    const state = createRulePipelineState({ rule: createRuleResponse() });

    const error = await getStepError(step, state);

    expect(error).toBeInstanceOf(Error);
    expect(getErrorSource(error!)).toBeUndefined();
  });

  it('yields rows from query results', async () => {
    mockHelpersEsqlArrowBatches(mockEsClient, [
      {
        numRows: 2,
        rows: [
          { 'host.name': 'host-a', count: 1 },
          { 'host.name': 'host-b', count: 2 },
        ],
      },
    ]);

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
    mockHelpersEsqlArrowBatches(mockEsClient, []);

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
});
