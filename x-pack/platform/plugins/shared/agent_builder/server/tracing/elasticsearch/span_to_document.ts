/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { tracing } from '@elastic/opentelemetry-node/sdk';
import { SpanKind, SpanStatusCode } from '@opentelemetry/api';
import {
  ElasticGenAIAttributes,
  GenAISemanticConventions,
} from '@kbn/inference-tracing';
import type { OtelTraceDocumentProperties } from './otel_traces_storage';

type HrTime = [number, number];

function hrTimeToMilliseconds(hrTime: HrTime): number {
  return hrTime[0] * 1000 + hrTime[1] / 1_000_000;
}

function hrTimeToISOString(hrTime: HrTime): string {
  const ms = hrTime[0] * 1000 + hrTime[1] / 1_000_000;
  return new Date(ms).toISOString();
}

const SPAN_KIND_MAP: Record<number, string> = {
  [SpanKind.INTERNAL]: 'INTERNAL',
  [SpanKind.SERVER]: 'SERVER',
  [SpanKind.CLIENT]: 'CLIENT',
  [SpanKind.PRODUCER]: 'PRODUCER',
  [SpanKind.CONSUMER]: 'CONSUMER',
};

const STATUS_CODE_MAP: Record<number, string> = {
  [SpanStatusCode.UNSET]: 'UNSET',
  [SpanStatusCode.OK]: 'OK',
  [SpanStatusCode.ERROR]: 'ERROR',
};

function sanitizeAttributes(
  attrs: Record<string, unknown> | undefined
): Record<string, unknown> {
  if (!attrs) return {};
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== undefined && value !== null) {
      result[key] = value;
    }
  }
  return result;
}

function getParentSpanId(span: tracing.ReadableSpan): string | undefined {
  if ('parentSpanId' in span && typeof span.parentSpanId === 'string') {
    return span.parentSpanId || undefined;
  }
  const parentCtx = (span as { parentSpanContext?: { spanId?: string } }).parentSpanContext;
  return parentCtx?.spanId || undefined;
}

export function spanToDocument(span: tracing.ReadableSpan): OtelTraceDocumentProperties {
  const spanContext = span.spanContext();
  const startTime = span.startTime as HrTime;
  const endTime = span.endTime as HrTime;
  const startMs = hrTimeToMilliseconds(startTime);
  const endMs = hrTimeToMilliseconds(endTime);
  const durationMs = endMs - startMs;

  const attrs = span.attributes;

  const agentId =
    (attrs[ElasticGenAIAttributes.AgentId] as string) ??
    (attrs[GenAISemanticConventions.GenAIAgentId] as string);

  const conversationId =
    (attrs[ElasticGenAIAttributes.AgentConversationId] as string) ??
    (attrs[GenAISemanticConventions.GenAIConversationId] as string);

  const operationName = attrs[GenAISemanticConventions.GenAIOperationName] as string | undefined;
  const inferenceSpanKind = attrs[ElasticGenAIAttributes.InferenceSpanKind] as string | undefined;

  const model =
    (attrs[GenAISemanticConventions.GenAIResponseModel] as string) ??
    (attrs[GenAISemanticConventions.GenAIRequestModel] as string);

  const inputTokens = attrs[GenAISemanticConventions.GenAIUsageInputTokens] as number | undefined;
  const outputTokens = attrs[GenAISemanticConventions.GenAIUsageOutputTokens] as number | undefined;

  const events = span.events.map((event) => ({
    name: event.name,
    time: hrTimeToISOString(event.time as HrTime),
    attributes: sanitizeAttributes(event.attributes as Record<string, unknown>),
  }));

  const doc: OtelTraceDocumentProperties = {
    trace_id: spanContext.traceId,
    span_id: spanContext.spanId,
    parent_span_id: getParentSpanId(span),
    name: span.name,
    kind: SPAN_KIND_MAP[span.kind] ?? 'INTERNAL',
    status_code: STATUS_CODE_MAP[span.status.code] ?? 'UNSET',
    status_message: span.status.message || undefined,
    start_time: hrTimeToISOString(startTime),
    end_time: hrTimeToISOString(endTime),
    duration_ms: Math.max(0, durationMs),
    agent_id: agentId,
    conversation_id: conversationId,
    operation_name: operationName,
    inference_span_kind: inferenceSpanKind,
    model,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    attributes: sanitizeAttributes(attrs as Record<string, unknown>),
    events: events.length > 0 ? events : undefined,
    resource: sanitizeAttributes(span.resource?.attributes as Record<string, unknown>),
    '@timestamp': hrTimeToISOString(startTime),
  };

  return doc;
}
