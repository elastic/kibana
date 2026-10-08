/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  collectStreamResults,
  createPipelineStream,
  createRuleExecutionInput,
  createRulePipelineState,
} from '../test_utils';
import type { PipelineStateStream, RulePipelineState, StepStreamResult } from './types';
import { forwardThenFinalize } from './stream_utils';

describe('forwardThenFinalize', () => {
  it('forwards every result unchanged and in order, then appends the finalize result', async () => {
    const first = createRulePipelineState();
    const second = createRulePipelineState();

    const results = await collectStreamResults(
      forwardThenFinalize(createPipelineStream([first, second]), {
        seed: 0,
        accumulate: (count) => count + 1,
        finalize: (count, lastState) => ({
          type: 'continue',
          state: { ...lastState, esqlRowBatch: [{ count }] },
        }),
      })
    );

    expect(results).toHaveLength(3);
    expect(results[0]).toEqual({ type: 'continue', state: first });
    expect(results[1]).toEqual({ type: 'continue', state: second });
    // finalize receives the folded accumulator (2 results) and the last state.
    expect(results[2].state.esqlRowBatch).toEqual([{ count: 2 }]);
  });

  it('passes the folded accumulator and the last forwarded state to finalize', async () => {
    const first = createRulePipelineState({
      input: createRuleExecutionInput({ ruleId: 'rule-a' }),
    });
    const last = createRulePipelineState({ input: createRuleExecutionInput({ ruleId: 'rule-b' }) });
    const finalize = jest.fn(
      (_acc: string[], _lastState: RulePipelineState): StepStreamResult | undefined => undefined
    );

    await collectStreamResults(
      forwardThenFinalize(createPipelineStream([first, last]), {
        seed: [] as string[],
        accumulate: (acc, state) => [...acc, state.input.ruleId],
        finalize,
      })
    );

    expect(finalize).toHaveBeenCalledTimes(1);
    expect(finalize).toHaveBeenCalledWith(['rule-a', 'rule-b'], last);
  });

  it('emits nothing extra when finalize returns undefined', async () => {
    const state = createRulePipelineState();

    const results = await collectStreamResults(
      forwardThenFinalize(createPipelineStream([state]), {
        seed: undefined,
        accumulate: (acc) => acc,
        finalize: () => undefined,
      })
    );

    expect(results).toEqual([{ type: 'continue', state }]);
  });

  it('forwards a halt and does not run finalize', async () => {
    const continueState = createRulePipelineState();
    const haltState = createRulePipelineState();
    const finalize = jest.fn(() => undefined);

    async function* upstream(): PipelineStateStream {
      yield { type: 'continue', state: continueState };
      yield { type: 'halt', reason: 'state_not_ready', state: haltState };
      // Anything after a halt must never be observed.
      yield { type: 'continue', state: createRulePipelineState() };
    }

    const results = await collectStreamResults(
      forwardThenFinalize(upstream(), { seed: 0, accumulate: (acc) => acc, finalize })
    );

    expect(results).toEqual([
      { type: 'continue', state: continueState },
      { type: 'halt', reason: 'state_not_ready', state: haltState },
    ]);
    expect(finalize).not.toHaveBeenCalled();
  });

  it('does not run finalize for an empty stream', async () => {
    const finalize = jest.fn(() => undefined);

    const results = await collectStreamResults(
      forwardThenFinalize(createPipelineStream([]), { seed: 0, accumulate: (acc) => acc, finalize })
    );

    expect(results).toEqual([]);
    expect(finalize).not.toHaveBeenCalled();
  });

  it('awaits an async finalize before emitting its result', async () => {
    const state = createRulePipelineState();

    const results = await collectStreamResults(
      forwardThenFinalize(createPipelineStream([state]), {
        seed: 0,
        accumulate: (count) => count + 1,
        finalize: async (count, lastState) => {
          await Promise.resolve();
          return { type: 'continue', state: { ...lastState, esqlRowBatch: [{ count }] } };
        },
      })
    );

    expect(results).toHaveLength(2);
    expect(results[1].state.esqlRowBatch).toEqual([{ count: 1 }]);
  });
});
