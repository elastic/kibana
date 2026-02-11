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

type FlatMapStepHandler = (state: RulePipelineState) => AsyncIterable<StepStreamResult>;
type OneToOneStepHandler = (
  state: RulePipelineState
) => Promise<StepStreamResult> | StepStreamResult;

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

export const mapOneToOneStep = (input: PipelineStateStream, handler: OneToOneStepHandler) =>
  pipeStream(input, handler);

export const flatMapStep = (input: PipelineStateStream, handler: FlatMapStepHandler) =>
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
