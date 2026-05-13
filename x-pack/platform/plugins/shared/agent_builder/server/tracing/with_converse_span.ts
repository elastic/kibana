/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Context, Span } from '@opentelemetry/api';
import { propagation, trace } from '@opentelemetry/api';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs';
import { safeJsonStringify } from '@kbn/std';
import {
  ElasticGenAIAttributes,
  GenAISemanticConventions,
  BAGGAGE_TRACKING_BEACON_KEY,
  BAGGAGE_TRACKING_BEACON_VALUE,
} from '@kbn/inference-tracing';
import type { ChatEvent } from '@kbn/agent-builder-common';
import { isRoundCompleteEvent } from '@kbn/agent-builder-common';
import {
  attachOpikDistributedTrace,
  type OpikDistributedTraceHeaders,
} from './opik_distributed_tracing';
import { withExplicitSpan } from './with_explicit_span';
import { getAgentBuilderTracer } from './register_tracing';

interface WithConverseSpanOptions {
  agentId: string;
  conversationId: string | undefined;
  opikHeaders?: OpikDistributedTraceHeaders;
}

/**
 * Sets the inference baggage beacon on the given context so that
 * `InferencePreservingSampler` and `isInferenceSpan` recognise
 * all child spans as inference work.
 */
function buildInferenceContext(parentCtx: Context): Context {
  let baggage = propagation.getBaggage(parentCtx) ?? propagation.createBaggage({});
  const isRoot =
    baggage.getEntry(BAGGAGE_TRACKING_BEACON_KEY)?.value !== BAGGAGE_TRACKING_BEACON_VALUE;

  if (isRoot) {
    baggage = baggage.setEntry(BAGGAGE_TRACKING_BEACON_KEY, {
      value: BAGGAGE_TRACKING_BEACON_VALUE,
    });
    return trace.deleteSpan(propagation.setBaggage(parentCtx, baggage));
  }

  return propagation.setBaggage(parentCtx, baggage);
}

export function withConverseSpan(
  { agentId, conversationId, opikHeaders }: WithConverseSpanOptions,
  parentCtx: Context,
  cb: (span: Span | undefined, ctx: Context) => Observable<ChatEvent>
): Observable<ChatEvent> {
  const tracer = getAgentBuilderTracer();
  if (!tracer) {
    return cb(undefined, parentCtx);
  }

  const inferenceCtx = buildInferenceContext(parentCtx);

  return withExplicitSpan(
    tracer,
    'Converse',
    {
      attributes: {
        [ElasticGenAIAttributes.InferenceSpanKind]: 'CHAIN',
        [ElasticGenAIAttributes.AgentId]: agentId,
        [ElasticGenAIAttributes.AgentConversationId]: conversationId,
        [GenAISemanticConventions.GenAIConversationId]: conversationId,
      },
    },
    inferenceCtx,
    (span, ctx) => {
      if (opikHeaders) {
        attachOpikDistributedTrace(span, opikHeaders);
      }

      return cb(span, ctx).pipe(
        tap({
          next: (event) => {
            if (isRoundCompleteEvent(event)) {
              span.setAttribute('output.value', safeJsonStringify(event.data) ?? 'unknown');
            }
          },
        })
      );
    }
  );
}
