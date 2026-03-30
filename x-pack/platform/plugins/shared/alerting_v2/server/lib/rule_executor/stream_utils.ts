/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PipelineStateStream, RulePipelineState, StepStreamResult } from './types';
import { hasState, type OptionalStateKey, type StateWith } from './type_guards';

type StepStreamOutput =
  | AsyncIterable<StepStreamResult>
  | Promise<StepStreamResult>
  | StepStreamResult;

type StepStreamHandler = (state: RulePipelineState) => StepStreamOutput;

type ExpandStepHandler = (state: RulePipelineState) => AsyncIterable<StepStreamResult>;
type MapStepHandler = (state: RulePipelineState) => Promise<StepStreamResult> | StepStreamResult;

const isAsyncIterable = (value: unknown): value is AsyncIterable<StepStreamResult> =>
  typeof (value as AsyncIterable<StepStreamResult>)?.[Symbol.asyncIterator] === 'function';

/**
 * Core stream transform for steps.
 *
 * Cancellation boundary checks are NOT performed here — they are the
 * responsibility of `CancellationBoundaryMiddleware` which wraps every
 * step globally. This keeps `pipeStream` focused on stream plumbing only.
 */
export const pipeStream = (input: PipelineStateStream, handler: StepStreamHandler) =>
  (async function* () {
    for await (const result of input) {
      if (result.type === 'halt') {
        yield result;
        return;
      }

      Object.freeze(result.state);

      const output = handler(result.state);

      if (isAsyncIterable(output)) {
        for await (const item of output) {
          yield item;
          if (item.type === 'halt') {
            return;
          }
        }

        continue;
      }

      const resolved = await output;

      yield resolved;

      if (resolved.type === 'halt') {
        return;
      }
    }
  })();

export const mapStep = (input: PipelineStateStream, handler: MapStepHandler) =>
  pipeStream(input, handler);

export const expandStep = (input: PipelineStateStream, handler: ExpandStepHandler) =>
  pipeStream(input, handler);

interface MissingStateResult {
  readonly ok: false;
  readonly result: StepStreamResult;
}

interface RequiredStateResult<K extends OptionalStateKey> {
  readonly ok: true;
  readonly state: StateWith<K>;
}

export const requireState = <K extends OptionalStateKey>(
  state: RulePipelineState,
  keys: readonly K[]
): MissingStateResult | RequiredStateResult<K> => {
  if (!hasState(state, keys)) {
    return {
      ok: false,
      result: { type: 'halt', reason: 'state_not_ready', state },
    };
  }

  return {
    ok: true,
    state,
  };
};

export const guardedMapStep = <K extends OptionalStateKey>(
  input: PipelineStateStream,
  requiredKeys: readonly K[],
  handler: (state: StateWith<K>) => Promise<StepStreamResult> | StepStreamResult
): PipelineStateStream =>
  mapStep(input, (state) => {
    const result = requireState(state, requiredKeys);
    if (!result.ok) {
      return result.result;
    }
    return handler(result.state);
  });

export const guardedExpandStep = <K extends OptionalStateKey>(
  input: PipelineStateStream,
  requiredKeys: readonly K[],
  handler: (state: StateWith<K>) => AsyncIterable<StepStreamResult>
): PipelineStateStream =>
  expandStep(input, async function* (state) {
    const result = requireState(state, requiredKeys);
    if (!result.ok) {
      yield result.result;
      return;
    }
    yield* handler(result.state);
  });
