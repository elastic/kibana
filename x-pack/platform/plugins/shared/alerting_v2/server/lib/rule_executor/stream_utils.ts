/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PipelineStateStream, RulePipelineState, StepStreamResult } from './types';

type StepStreamHandler =
  | ((state: RulePipelineState) => AsyncIterable<StepStreamResult>)
  | ((state: RulePipelineState) => Promise<StepStreamResult | void>)
  | ((state: RulePipelineState) => StepStreamResult | void);

const isAsyncIterable = (value: unknown): value is AsyncIterable<StepStreamResult> =>
  typeof (value as AsyncIterable<StepStreamResult>)?.[Symbol.asyncIterator] === 'function';

export const pipeStream = (input: PipelineStateStream, handler: StepStreamHandler) =>
  (async function* () {
    for await (const result of input) {
      if (result.type === 'halt') {
        yield result;
        return;
      }

      const output = handler(result.state);

      if (!output) {
        continue;
      }

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
      if (!resolved) {
        continue;
      }

      yield resolved;
      if (resolved.type === 'halt') {
        return;
      }
    }
  })();
