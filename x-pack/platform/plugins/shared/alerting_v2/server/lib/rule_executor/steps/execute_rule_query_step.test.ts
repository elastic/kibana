/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecuteRuleQueryStep } from './execute_rule_query_step';
import {
  collectStreamResults,
  createEsqlResponse,
  createPipelineStream,
  createRuleExecutionInput,
  createRuleResponse,
  createRulePipelineState,
} from '../test_utils';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { createQueryService } from '../../services/query_service/query_service.mock';
import type { DeeplyMockedApi } from '@kbn/core-elasticsearch-client-server-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';

describe('ExecuteRuleQueryStep', () => {
  let step: ExecuteRuleQueryStep;
  let mockEsClient: DeeplyMockedApi<ElasticsearchClient>;

  beforeEach(() => {
    const { loggerService } = createLoggerService();
    const mocks = createQueryService();
    mockEsClient = mocks.mockEsClient;
    step = new ExecuteRuleQueryStep(loggerService, mocks.queryService);
  });

  it('builds query payload and executes query', async () => {
    mockEsClient.esql.query.mockResolvedValue(
      createEsqlResponse([{ name: 'host.name', type: 'keyword' }], [['host-a']])
    );

    const state = createRulePipelineState({ rule: createRuleResponse() });
    const results = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('continue');
    expect(results[0].state.queryPayload).toBeDefined();
    expect(results[0].state.esqlRowBatch).toEqual([{ 'host.name': 'host-a' }]);
  });

  it('passes correct parameters to ES client', async () => {
    mockEsClient.esql.query.mockResolvedValue(
      createEsqlResponse([{ name: 'host.name', type: 'keyword' }], [['host-a']])
    );

    const rule = createRuleResponse();
    const abortController = new AbortController();
    const input = createRuleExecutionInput({ abortSignal: abortController.signal });
    const state = createRulePipelineState({ input, rule });

    await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(mockEsClient.esql.query).toHaveBeenCalledWith(
      expect.objectContaining({ query: rule.query }),
      expect.objectContaining({ signal: abortController.signal })
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

  it('halts with state_not_ready when rule is missing from state', async () => {
    const state = createRulePipelineState();

    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(result).toEqual({ type: 'halt', reason: 'state_not_ready', state });
  });
});
