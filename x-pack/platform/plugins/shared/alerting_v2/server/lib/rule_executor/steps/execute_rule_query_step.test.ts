/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecuteRuleQueryStep } from './execute_rule_query_step';
import {
  collectStreamResults,
  createBatchStream,
  createPipelineStream,
  createRuleExecutionInput,
  createRuleResponse,
  createRulePipelineState,
} from '../test_utils';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { createQueryService } from '../../services/query_service/query_service.mock';

describe('ExecuteRuleQueryStep', () => {
  let step: ExecuteRuleQueryStep;
  let queryService: ReturnType<typeof createQueryService>['queryService'];

  beforeEach(() => {
    const { loggerService } = createLoggerService();
    const mocks = createQueryService();
    queryService = mocks.queryService;
    step = new ExecuteRuleQueryStep(loggerService, queryService);
  });

  it('builds query payload and executes query', async () => {
    const batch = [{ 'host.name': 'host-a' }];
    jest.spyOn(queryService, 'executeQueryStream').mockReturnValue(createBatchStream([batch]));

    const state = createRulePipelineState({ rule: createRuleResponse() });
    const results = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('continue');
    expect(results[0].state.queryPayload).toBeDefined();
    expect(results[0].state.esqlRowBatch).toEqual(batch);
  });

  it('passes correct parameters to query service', async () => {
    const executeStreamSpy = jest
      .spyOn(queryService, 'executeQueryStream')
      .mockReturnValue(createBatchStream([[]]));

    const rule = createRuleResponse();
    const abortController = new AbortController();
    const input = createRuleExecutionInput({ abortSignal: abortController.signal });
    const state = createRulePipelineState({ input, rule });

    await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(executeStreamSpy).toHaveBeenCalledWith({
      query: rule.query,
      filter: expect.any(Object),
      params: undefined,
      abortSignal: input.executionContext.signal,
    });
  });

  it('throws abort error when signal is aborted', async () => {
    const abortController = new AbortController();
    abortController.abort();

    jest.spyOn(queryService, 'executeQueryStream').mockReturnValue(
      (async function* () {
        throw new Error('Request aborted');
      })()
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
    jest.spyOn(queryService, 'executeQueryStream').mockReturnValue(
      (async function* () {
        throw new Error('Query execution failed');
      })()
    );

    const state = createRulePipelineState({ rule: createRuleResponse() });

    await expect(
      collectStreamResults(step.executeStream(createPipelineStream([state])))
    ).rejects.toThrow('Query execution failed');
  });

  it('halts with state_not_ready when rule is missing from state', async () => {
    const state = createRulePipelineState();

    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(result).toEqual({ type: 'halt', reason: 'state_not_ready', state });
  });
});
