/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of, throwError } from 'rxjs';
import { ExecuteRuleQueryStep } from './execute_rule_query_step';
import type { RulePipelineState, RuleExecutionInput } from '../types';
import type { RuleResponse } from '../../rules_client';
import { createRuleExecutionInput, createRuleResponse, createEsqlResponse } from '../test_utils';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { createQueryService } from '../../services/query_service/query_service.mock';

describe('ExecuteRuleQueryStep', () => {
  const createState = (input: RuleExecutionInput, rule?: RuleResponse): RulePipelineState => ({
    input,
    rule,
  });

  it('builds query payload and executes query', async () => {
    const { loggerService } = createLoggerService();
    const { queryService, mockSearchClient } = createQueryService();
    const esqlResponse = createEsqlResponse();

    mockSearchClient.search.mockReturnValue(of({ isRunning: false, rawResponse: esqlResponse }));

    const step = new ExecuteRuleQueryStep(loggerService, queryService);
    const state = createState(createRuleExecutionInput(), createRuleResponse());

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    expect(result).toHaveProperty('data.queryPayload');
    expect(result).toHaveProperty('data.esqlResponse');

    // @ts-expect-error: the above checks ensure the data exists
    expect(result.data.esqlResponse).toEqual(esqlResponse);
  });

  it('passes correct parameters to query service', async () => {
    const { loggerService } = createLoggerService();
    const { queryService, mockSearchClient } = createQueryService();
    mockSearchClient.search.mockReturnValue(
      of({ isRunning: false, rawResponse: createEsqlResponse() })
    );

    const step = new ExecuteRuleQueryStep(loggerService, queryService);
    const rule = createRuleResponse();
    const abortController = new AbortController();
    const state = createState(
      createRuleExecutionInput({ abortSignal: abortController.signal }),
      rule
    );

    await step.execute(state);

    expect(mockSearchClient.search).toHaveBeenCalledWith(
      {
        params: {
          query: rule.query,
          dropNullColumns: false,
          filter: expect.any(Object),
          params: undefined,
        },
      },
      expect.objectContaining({
        strategy: 'esql',
        abortSignal: abortController.signal,
      })
    );
  });

  it('throws abort error when signal is aborted', async () => {
    const { loggerService } = createLoggerService();
    const { queryService, mockSearchClient } = createQueryService();
    const abortController = new AbortController();
    abortController.abort();

    mockSearchClient.search.mockReturnValue(throwError(() => new Error('Request aborted')));

    const step = new ExecuteRuleQueryStep(loggerService, queryService);
    const state = createState(
      createRuleExecutionInput({ abortSignal: abortController.signal }),
      createRuleResponse()
    );

    await expect(step.execute(state)).rejects.toThrow(
      'Search has been aborted due to cancelled execution'
    );
  });

  it('propagates non-abort errors', async () => {
    const { loggerService } = createLoggerService();
    const { queryService, mockSearchClient } = createQueryService();
    mockSearchClient.search.mockReturnValue(throwError(() => new Error('Query execution failed')));

    const step = new ExecuteRuleQueryStep(loggerService, queryService);
    const state = createState(createRuleExecutionInput(), createRuleResponse());

    await expect(step.execute(state)).rejects.toThrow('Query execution failed');
  });

  it('halts with state_not_ready when rule is missing from state', async () => {
    const { loggerService } = createLoggerService();
    const { queryService } = createQueryService();

    const step = new ExecuteRuleQueryStep(loggerService, queryService);
    const state = createState(createRuleExecutionInput(), undefined);

    const result = await step.execute(state);

    expect(result).toEqual({ type: 'halt', reason: 'state_not_ready' });
  });
});
