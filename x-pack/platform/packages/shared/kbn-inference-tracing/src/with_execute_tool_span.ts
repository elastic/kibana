/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Span } from '@opentelemetry/api';
import { isPromise } from 'util/types';
import { safeJsonStringify } from '@kbn/std';
import { withInferenceSpan } from './with_inference_span';
import { ElasticGenAIAttributes, GenAISemanticConventions } from './types';

/**
 * Wrapper around {@link withInferenceSpan} that sets the right attributes for a execute_tool operation span.
 * @param options
 * @param cb
 */
export function withExecuteToolSpan<T>(
  options: string | { name: string; description?: string; toolCallId?: string; input?: unknown },
  cb: (span?: Span) => T
): T {
  const { name, description, toolCallId, input } =
    typeof options === 'string'
      ? { name: options, description: undefined, toolCallId: undefined, input: undefined }
      : options;

  return withInferenceSpan(
    {
      name: `execute_tool ${name}`,
      [GenAISemanticConventions.GenAIToolName]: name,
      [GenAISemanticConventions.GenAIOperationName]: 'execute_tool',
      [GenAISemanticConventions.GenAIToolCallId]: toolCallId,
      [ElasticGenAIAttributes.InferenceSpanKind]: 'TOOL',
      [ElasticGenAIAttributes.ToolDescription]: description,
      [ElasticGenAIAttributes.ToolParameters]: safeJsonStringify(input),
    },
    (span) => {
      if (!span) {
        return cb();
      }

      const res = cb(span);

      if (isPromise(res)) {
        res.then(
          (value) => {
            const stringified = safeJsonStringify(value);
            if (stringified) {
              span.setAttribute('output.value', stringified);
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
