/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Span } from '@opentelemetry/api';
import { isPromise } from 'util/types';
import { withInferenceSpan } from './with_inference_span';
import { GenAISemanticConventions } from './types';

/**
 * Wrapper around {@link withInferenceSpan} that sets the right attributes for a execute_tool operation span.
 * @param options
 * @param cb
 */
export function withExecuteToolSpan<T>(
  options: string | { name: string; toolCallId?: string; input?: unknown },
  cb: (span?: Span) => T
): T {
  const { name, toolCallId, input } =
    typeof options === 'string'
      ? { name: options, toolCallId: undefined, input: undefined }
      : options;

  return withInferenceSpan(
    {
      name: 'execute_tool',
      [GenAISemanticConventions.GenAIToolName]: name,
      [GenAISemanticConventions.GenAIOperationName]: 'execute_tool',
      [GenAISemanticConventions.GenAIToolCallId]: toolCallId,
      'input.value': input,
    },
    (span) => {
      if (!span) {
        return cb();
      }

      const res = cb(span);

      if (isPromise(res)) {
        res.then(
          (value) => {
            try {
              span?.setAttribute('output.value', JSON.stringify(value));
            } catch (err) {
              // oh well
            }
          },
          // if the promise fails, we catch it and noop
          () => {}
        );
        return res;
      }

      return res;
    }
  );
}
