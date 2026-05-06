/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CancellationBoundaryMiddleware } from './cancellation_boundary_middleware';
import { createRuleExecutionMiddlewareContext } from './test_utils';
import {
  collectStreamResults,
  createPipelineStream,
  createRuleExecutionInput,
  createRulePipelineState,
} from '../test_utils';
import { getStepNameFromError } from '../step_error';

describe('CancellationBoundaryMiddleware', () => {
  let middleware: CancellationBoundaryMiddleware;

  beforeEach(() => {
    middleware = new CancellationBoundaryMiddleware();
  });

  it('passes through results when signal is active', async () => {
    const state = createRulePipelineState();
    const next = jest.fn().mockReturnValue(createPipelineStream([state]));

    const context = createRuleExecutionMiddlewareContext();
    const results = await collectStreamResults(
      middleware.execute(context, next, createPipelineStream([state]))
    );

    expect(next).toHaveBeenCalledTimes(1);
    expect(results).toEqual([{ type: 'continue', state }]);
  });

  it('throws when input stream contains aborted signal', async () => {
    const abortController = new AbortController();
    abortController.abort();

    const state = createRulePipelineState({
      input: createRuleExecutionInput({ abortSignal: abortController.signal }),
    });

    const next = jest.fn((input) => input);
    const context = createRuleExecutionMiddlewareContext();

    await expect(
      collectStreamResults(middleware.execute(context, next, createPipelineStream([state])))
    ).rejects.toThrow(/aborted/i);
  });

  it('throws when wrapped step output contains aborted signal', async () => {
    const abortController = new AbortController();
    const preState = createRulePipelineState();
    const abortedState = createRulePipelineState({
      input: createRuleExecutionInput({ abortSignal: abortController.signal }),
    });

    const next = jest.fn().mockReturnValue(
      (async function* () {
        abortController.abort();
        yield { type: 'continue' as const, state: abortedState };
      })()
    );

    const context = createRuleExecutionMiddlewareContext();

    await expect(
      collectStreamResults(middleware.execute(context, next, createPipelineStream([preState])))
    ).rejects.toThrow(/aborted/i);
  });

  it('tags the cancellation error with the current step name on input abort', async () => {
    const abortController = new AbortController();
    abortController.abort();

    const state = createRulePipelineState({
      input: createRuleExecutionInput({ abortSignal: abortController.signal }),
    });

    const next = jest.fn((input) => input);
    const context = createRuleExecutionMiddlewareContext({ name: 'execute_rule_query' });

    try {
      await collectStreamResults(middleware.execute(context, next, createPipelineStream([state])));
      fail('Expected stream to throw');
    } catch (error) {
      expect(getStepNameFromError(error)).toBe('execute_rule_query');
    }
  });

  it('tags the cancellation error with the current step name on output abort', async () => {
    const abortController = new AbortController();
    const preState = createRulePipelineState();
    const abortedState = createRulePipelineState({
      input: createRuleExecutionInput({ abortSignal: abortController.signal }),
    });

    const next = jest.fn().mockReturnValue(
      (async function* () {
        abortController.abort();
        yield { type: 'continue' as const, state: abortedState };
      })()
    );

    const context = createRuleExecutionMiddlewareContext({ name: 'store_alert_events' });

    try {
      await collectStreamResults(
        middleware.execute(context, next, createPipelineStream([preState]))
      );
      fail('Expected stream to throw');
    } catch (error) {
      expect(getStepNameFromError(error)).toBe('store_alert_events');
    }
  });
});
