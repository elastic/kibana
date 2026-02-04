/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecuteRuleQueryStep } from './execute_rule_query_step';
import {
  createRuleExecutionInput,
  createRuleResponse,
  createEsqlResponse,
  createRulePipelineState,
} from '../test_utils';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { createQueryService } from '../../services/query_service/query_service.mock';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { DeeplyMockedApi } from '@kbn/core-elasticsearch-client-server-mocks';

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
    const esqlResponse = createEsqlResponse();

    mockEsClient.esql.query.mockResolvedValue(esqlResponse);

    const state = createRulePipelineState({ rule: createRuleResponse() });
    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    expect(result).toHaveProperty('data.queryPayload');
    expect(result).toHaveProperty('data.esqlResponse');

    // @ts-expect-error: the above checks ensure the data exists
    expect(result.data.esqlResponse).toEqual(esqlResponse);
  });

  it('passes correct parameters to query service', async () => {
    mockEsClient.esql.query.mockResolvedValue(createEsqlResponse());

    const rule = createRuleResponse();
    const abortController = new AbortController();
    const state = createRulePipelineState({
      input: createRuleExecutionInput({ abortSignal: abortController.signal }),
      rule,
    });

    await step.execute(state);

    expect(mockEsClient.esql.query).toHaveBeenCalledWith(
      {
        query: rule.query,
        drop_null_columns: false,
        filter: expect.any(Object),
        params: undefined,
      },
      { signal: abortController.signal }
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

    await expect(step.execute(state)).rejects.toThrow(
      'Search has been aborted due to cancelled execution'
    );
  });

  it('propagates non-abort errors', async () => {
    mockEsClient.esql.query.mockRejectedValue(new Error('Query execution failed'));

    const state = createRulePipelineState({ rule: createRuleResponse() });

    await expect(step.execute(state)).rejects.toThrow('Query execution failed');
  });

  it('halts with state_not_ready when rule is missing from state', async () => {
    const state = createRulePipelineState();

    const result = await step.execute(state);

    expect(result).toEqual({ type: 'halt', reason: 'state_not_ready' });
  });
});
