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
});
