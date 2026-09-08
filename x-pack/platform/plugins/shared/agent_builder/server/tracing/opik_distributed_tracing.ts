/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { api, tracing } from '@elastic/opentelemetry-node/sdk';
import { trace } from '@opentelemetry/api';
import { v7 as uuidv7, validate as uuidValidate, version as uuidVersion } from 'uuid';
import { isInferenceSpan } from '@kbn/inference-tracing';

const OPIK_TRACE_ID = 'opik.trace_id';
const OPIK_SPAN_ID = 'opik.span_id';
const OPIK_PARENT_SPAN_ID = 'opik.parent_span_id';

export interface OpikDistributedTraceHeaders {
  opik_trace_id?: string;
  opik_parent_span_id?: string;
}

interface OpikSpanInfo {
  traceId: string;
  spanId: string;
}

const isValidUuidV7 = (value: unknown): value is string =>
  typeof value === 'string' && uuidValidate(value) && uuidVersion(value) === 7;

/**
 * Shared registry mapping OTel span ID → Opik span info. Populated by
 * attachOpikDistributedTrace for the boundary span and by the processor for
 * all descendant spans. Entries are removed in onEnd to avoid memory leaks.
 */
const opikSpanRegistry = new Map<string, OpikSpanInfo>();

/**
 * Reads opik_trace_id and opik_parent_span_id from request headers, sets
 * opik.trace_id, opik.span_id, and opik.parent_span_id as OTel span attributes
 * on the boundary span, and registers the span in the shared registry so the
 * OpikDistributedTracingSpanProcessor can propagate opik context to descendants.
 *
 * Returns true if the headers contained valid Opik trace context, false otherwise.
 */
export const attachOpikDistributedTrace = (
  span: api.Span,
  headers: OpikDistributedTraceHeaders
): boolean => {
  const { opik_trace_id: traceId, opik_parent_span_id: parentSpanId } = headers;

  if (!traceId || !isValidUuidV7(traceId)) {
    return false;
  }

  const opikSpanId = uuidv7();

  const attrs: Record<string, string> = {
    [OPIK_TRACE_ID]: traceId,
    [OPIK_SPAN_ID]: opikSpanId,
  };

  if (parentSpanId && isValidUuidV7(parentSpanId)) {
    attrs[OPIK_PARENT_SPAN_ID] = parentSpanId;
  }

  span.setAttributes(attrs);

  // Register the boundary span so the processor can propagate opik context to descendants.
  opikSpanRegistry.set(span.spanContext().spanId, { traceId, spanId: opikSpanId });

  return true;
};

/**
 * Propagates opik.trace_id from a boundary span to all its descendants,
 * assigning each a new opik.span_id and setting opik.parent_span_id to the
 * parent's opik.span_id. This ensures every child span lands under the correct
 * Opik trace in the Opik UI.
 *
 * Uses a shared registry keyed by OTel span ID to track opik span assignments,
 * avoiding any cast of api.Span to ReadableSpan to read parent attributes.
 */
export class OpikDistributedTracingSpanProcessor implements tracing.SpanProcessor {
  onStart(span: tracing.Span, parentContext: api.Context): void {
    if (!isInferenceSpan(span, parentContext)) return;

    const parentOtelSpanId = trace.getSpan(parentContext)?.spanContext().spanId;
    const parentOpikInfo = parentOtelSpanId ? opikSpanRegistry.get(parentOtelSpanId) : undefined;

    if (!parentOpikInfo) return;

    const newOpikSpanId = uuidv7();
    opikSpanRegistry.set(span.spanContext().spanId, {
      traceId: parentOpikInfo.traceId,
      spanId: newOpikSpanId,
    });

    span.setAttribute(OPIK_TRACE_ID, parentOpikInfo.traceId);
    span.setAttribute(OPIK_SPAN_ID, newOpikSpanId);
    span.setAttribute(OPIK_PARENT_SPAN_ID, parentOpikInfo.spanId);
  }

  onEnd(span: tracing.ReadableSpan): void {
    opikSpanRegistry.delete(span.spanContext().spanId);
  }

  forceFlush(): Promise<void> {
    return Promise.resolve();
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }
}
