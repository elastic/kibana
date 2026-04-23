/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Context, SpanKind, Link, SpanAttributes } from '@opentelemetry/api';
import { propagation } from '@opentelemetry/api';
import { tracing } from '@elastic/opentelemetry-node/sdk';
import { BAGGAGE_TRACKING_BEACON_KEY, BAGGAGE_TRACKING_BEACON_VALUE } from './baggage';

/**
 * Sampler wrapper that ensures inference spans are always recorded, even when
 * the global sample rate drops them.
 *
 * This sampler wraps the global TracerProvider's sampler and is applied to ALL
 * spans (not just inference ones). For non-inference spans it is a transparent
 * pass-through — the delegate's decision is returned unchanged.
 *
 * For inference spans (identified by the `kibana.inference.tracing` baggage):
 * - If the delegate already samples them (RECORD or RECORD_AND_SAMPLED),
 *   the decision is returned as-is. These spans flow through all exporters
 *   normally, including the global telemetry pipeline.
 * - If the delegate drops them (NOT_RECORD), the decision is upgraded to
 *   RECORD. This means the span is created and processors can see it, but the
 *   SAMPLED trace flag is NOT set. As a result:
 *     - Standard BatchSpanProcessor.onEnd skips them (no SAMPLED flag), so
 *       they do NOT appear in global telemetry exporters (http, Phoenix, etc.).
 *     - AgentBuilderSpanProcessor forces the SAMPLED flag on a copy before
 *       passing to its own BatchSpanProcessor, so they DO reach the dedicated
 *       Agent Builder ES endpoint.
 *
 * Net effect: inference spans are always 100% captured for the Agent Builder
 * in-app tracer, but they respect the configured sample rate for global
 * telemetry — unless they were already naturally sampled.
 */
export class InferencePreservingSampler implements tracing.Sampler {
  constructor(private readonly delegate: tracing.Sampler) {}

  shouldSample(
    ctx: Context,
    traceId: string,
    spanName: string,
    spanKind: SpanKind,
    attributes: SpanAttributes,
    links: Link[]
  ): tracing.SamplingResult {
    const result = this.delegate.shouldSample(ctx, traceId, spanName, spanKind, attributes, links);

    if (result.decision !== tracing.SamplingDecision.NOT_RECORD) {
      return result;
    }

    const baggage = propagation.getBaggage(ctx);
    const inInferenceContext =
      baggage?.getEntry(BAGGAGE_TRACKING_BEACON_KEY)?.value === BAGGAGE_TRACKING_BEACON_VALUE;

    if (!inInferenceContext) {
      return result;
    }

    return {
      ...result,
      decision: tracing.SamplingDecision.RECORD,
    };
  }

  toString(): string {
    return `InferencePreservingSampler{${this.delegate}}`;
  }
}
