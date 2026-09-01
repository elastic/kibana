/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Span } from '@opentelemetry/api';
import { SpanKind, SpanStatusCode } from '@opentelemetry/api';
import { isPromise } from 'util/types';
import { safeJsonStringify } from '@kbn/std';
import type { WithActiveSpanOptions } from '@kbn/tracing-utils';
import { ElasticGenAIAttributes, GenAISemanticConventions } from './types';
import { withActiveInferenceSpan } from './with_active_inference_span';

/**
 * Per the GenAI semantic conventions (and MCP conventions), when a tool
 * call succeeds at the execution level but the tool itself returns an
 * error result, `error.type` SHOULD be set to `'tool_error'`.
 */
export const TOOL_ERROR_TYPE = 'tool_error';

export interface MarkToolSpanAsErrorOptions {
  result?: unknown;
  error?: Error;
}

/**
 * Marks a tool span as errored per GenAI/MCP semantic conventions.
 * Also ends the span so that downstream handlers (e.g. `handlePromise`
 * in `withActiveSpan`) cannot override the status back to `OK`.
 */
export const markToolSpanAsError = (
  span: Span,
  { result, error }: MarkToolSpanAsErrorOptions = {}
) => {
  if (!span.isRecording()) {
    return;
  }

  if (error) {
    span.recordException(error);
  }

  const payload = result ?? (error ? { error: error.message } : undefined);
  const stringified = payload === undefined ? undefined : safeJsonStringify(payload);
  if (stringified) {
    span.setAttribute(GenAISemanticConventions.GenAIToolCallResult, stringified);
  }

  span.setAttribute('error.type', TOOL_ERROR_TYPE);
  span.setStatus({ code: SpanStatusCode.ERROR, message: TOOL_ERROR_TYPE });
  span.end();
};

/**
 * Wrapper around {@link withActiveInferenceSpan} that sets the right attributes for a execute_tool operation span.
 * @param options
 * @param cb
 */
export function withExecuteToolSpan<T>(
  toolName: string,
  options: WithActiveSpanOptions & {
    tool: {
      description?: string;
      toolCallId?: string;
      input?: unknown;
    };
  },
  cb: (span?: Span) => T
): T {
  const { description, toolCallId, input } = options.tool;

  return withActiveInferenceSpan(
    `execute_tool ${toolName}`,
    {
      ...options,
      kind: SpanKind.INTERNAL,
      attributes: {
        ...options.attributes,
        [GenAISemanticConventions.GenAIToolName]: toolName,
        [GenAISemanticConventions.GenAIOperationName]: 'execute_tool',
        [GenAISemanticConventions.GenAIToolCallId]: toolCallId,
        [ElasticGenAIAttributes.InferenceSpanKind]: 'TOOL',
        [GenAISemanticConventions.GenAIToolDescription]: description,
        [GenAISemanticConventions.GenAIToolCallArguments]: safeJsonStringify(input),
        [GenAISemanticConventions.GenAIToolType]: 'extension',
      },
    },
    (span) => {
      if (!span) {
        return cb();
      }

      try {
        const res = cb(span);

        if (isPromise(res)) {
          return res.then(
            (value) => {
              const stringified = safeJsonStringify(value);
              if (stringified) {
                span.setAttribute(GenAISemanticConventions.GenAIToolCallResult, stringified);
              }
              return value;
            },
            (error) => {
              // Any error bubbling out of a tool span is a tool-call failure.
              markToolSpanAsError(span, { error });
              throw error;
            }
          ) as T;
        }

        return res;
      } catch (error) {
        markToolSpanAsError(span, { error });
        throw error;
      }
    }
  );
}
