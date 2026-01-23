/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of, throwError } from 'rxjs';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { ExecuteQueryStep } from './execute_query_step';
import type { RulePipelineState, RuleExecutionInput } from '../types';
import type { QueryPayload } from '../get_query_payload';
import type { RuleResponse } from '../../rules_client';
import {
  createQueryService,
  createLoggerService,
  createRuleExecutionInput,
  createRuleResponse,
} from '../../test_utils';

describe('ExecuteQueryStep', () => {
  const createQueryPayload = (): QueryPayload => ({
    filter: { bool: { filter: [] } },
    params: [],
    dateStart: '2024-12-31T23:55:00.000Z',
    dateEnd: '2025-01-01T00:00:00.000Z',
  });

  const createEsqlResponse = (): ESQLSearchResponse => ({
    columns: [{ name: 'host.name', type: 'keyword' }],
    values: [['host-a'], ['host-b']],
  });

  const createState = (
    input: RuleExecutionInput,
    rule?: RuleResponse,
    queryPayload?: QueryPayload
  ): RulePipelineState => ({
    input,
    rule,
    queryPayload,
  });

  it('executes query and continues with esqlResponse', async () => {
    const { loggerService } = createLoggerService();
    const { queryService, mockSearchClient } = createQueryService();
    const esqlResponse = createEsqlResponse();

    mockSearchClient.search.mockReturnValue(
      of({ isRunning: false, rawResponse: esqlResponse })
    );

    const step = new ExecuteQueryStep(loggerService, queryService);
    const state = createState(createRuleExecutionInput(), createRuleResponse(), createQueryPayload());

    const result = await step.execute(state);

    expect(result).toEqual({
      type: 'continue',
      data: { esqlResponse },
    });
  });

  it('passes correct parameters to query service', async () => {
    const { loggerService } = createLoggerService();
    const { queryService, mockSearchClient } = createQueryService();
    mockSearchClient.search.mockReturnValue(
      of({ isRunning: false, rawResponse: createEsqlResponse() })
    );

    const step = new ExecuteQueryStep(loggerService, queryService);
    const rule = createRuleResponse();
    const queryPayload = createQueryPayload();
    const abortController = new AbortController();
    const state = createState(
      createRuleExecutionInput({ abortSignal: abortController.signal }),
      rule,
      queryPayload
    );

    await step.execute(state);

    expect(mockSearchClient.search).toHaveBeenCalledWith(
      {
        params: {
          query: rule.query,
          dropNullColumns: false,
          filter: queryPayload.filter,
          params: queryPayload.params,
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

    const step = new ExecuteQueryStep(loggerService, queryService);
    const state = createState(
      createRuleExecutionInput({ abortSignal: abortController.signal }),
      createRuleResponse(),
      createQueryPayload()
    );

    await expect(step.execute(state)).rejects.toThrow(
      'Search has been aborted due to cancelled execution'
    );
  });

  it('propagates non-abort errors', async () => {
    const { loggerService } = createLoggerService();
    const { queryService, mockSearchClient } = createQueryService();
    mockSearchClient.search.mockReturnValue(
      throwError(() => new Error('Query execution failed'))
    );

    const step = new ExecuteQueryStep(loggerService, queryService);
    const state = createState(createRuleExecutionInput(), createRuleResponse(), createQueryPayload());

    await expect(step.execute(state)).rejects.toThrow('Query execution failed');
  });

  it('throws when rule is missing from state', async () => {
    const { loggerService } = createLoggerService();
    const { queryService } = createQueryService();

    const step = new ExecuteQueryStep(loggerService, queryService);
    const state = createState(createRuleExecutionInput(), undefined, createQueryPayload());

    await expect(step.execute(state)).rejects.toThrow(
      'ExecuteQueryStep requires rule from previous step'
    );
  });

  it('throws when queryPayload is missing from state', async () => {
    const { loggerService } = createLoggerService();
    const { queryService } = createQueryService();

    const step = new ExecuteQueryStep(loggerService, queryService);
    const state = createState(createRuleExecutionInput(), createRuleResponse(), undefined);

    await expect(step.execute(state)).rejects.toThrow(
      'ExecuteQueryStep requires queryPayload from previous step'
    );
  });

  it('logs debug message with response', async () => {
    const { loggerService, mockLogger } = createLoggerService();
    const { queryService, mockSearchClient } = createQueryService();
    mockSearchClient.search.mockReturnValue(
      of({ isRunning: false, rawResponse: createEsqlResponse() })
    );

    const step = new ExecuteQueryStep(loggerService, queryService);
    const state = createState(createRuleExecutionInput(), createRuleResponse(), createQueryPayload());

    await step.execute(state);

    expect(mockLogger.debug).toHaveBeenCalled();
  });

  it('has correct step name', () => {
    const { loggerService } = createLoggerService();
    const { queryService } = createQueryService();
    const step = new ExecuteQueryStep(loggerService, queryService);

    expect(step.name).toBe('execute_query');
  });
});
