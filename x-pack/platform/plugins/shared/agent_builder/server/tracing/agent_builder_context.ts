/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { api } from '@elastic/opentelemetry-node/sdk';
import type { tracing } from '@elastic/opentelemetry-node/sdk';
import { context as otelContext, propagation } from '@opentelemetry/api';
import { isInferenceSpan, CONVERSATION_ID_BAGGAGE_KEY } from '@kbn/inference-tracing';
import { buildAgentBuilderTracesNamespace } from '../../common/traces';

export const AGENT_BUILDER_OWNER_BAGGAGE_KEY = 'kibana.agent_builder';
export const AGENT_BUILDER_OWNER_BAGGAGE_VALUE = '1';
/**
 * W3C baggage key carrying the per-agent trace data-stream namespace (`<spaceId>` or
 * `<spaceId>.<agentId>`). Set by {@link withAgentBuilderContext} on the root span's context so
 * every descendant span — not just the ones carrying `gen_ai.agent.id` — routes to the same
 * agent's stream. Mapped onto {@link DATA_STREAM_NAMESPACE_ATTR} by the tracing span processor.
 */
export const TRACES_NAMESPACE_BAGGAGE_KEY = 'agent_builder.traces_namespace';
export const DATA_STREAM_NAMESPACE_ATTR = 'data_stream.namespace';

/**
 * Executes a function within a context that has the Agent Builder ownership baggage set,
 * along with an optional space ID (and agent ID) for data stream routing.
 * All descendant inference spans created inside this context will be tagged as Agent Builder spans,
 * allowing the AgentBuilderSpanProcessor to filter them from other inference consumers.
 *
 * When `spaceId` is provided, the traces-namespace baggage is always set — falling back to the
 * unresolved-agent namespace when `agentId` can't be resolved, so routing never broadens beyond the
 * space nor leaves data in an unreadable bare-space stream.
 *
 * The namespace is set once on the conversation root context and inherited by every descendant span
 * via OTel context propagation. In a multi-agent round this means a sub-agent's spans route to the
 * *root* agent's stream while still carrying their own `gen_ai.agent.id` — break results down by
 * that attribute, not by stream/index name.
 */
export const withAgentBuilderContext = <T>(
  fn: () => T,
  options?: { spaceId?: string; agentId?: string; conversationId?: string }
): T => {
  const ctx = otelContext.active();
  let baggage = propagation.getBaggage(ctx) ?? propagation.createBaggage();
  baggage = baggage.setEntry(AGENT_BUILDER_OWNER_BAGGAGE_KEY, {
    value: AGENT_BUILDER_OWNER_BAGGAGE_VALUE,
  });
  if (options?.spaceId) {
    baggage = baggage.setEntry(TRACES_NAMESPACE_BAGGAGE_KEY, {
      value: buildAgentBuilderTracesNamespace({
        spaceId: options.spaceId,
        agentId: options.agentId,
      }),
    });
  }
  if (options?.conversationId) {
    baggage = baggage.setEntry(CONVERSATION_ID_BAGGAGE_KEY, { value: options.conversationId });
  }
  const updatedContext = propagation.setBaggage(ctx, baggage);

  return otelContext.with(updatedContext, fn);
};

/**
 * Checks whether a span originates from Agent Builder by inspecting baggage
 * and verifying it is an inference span.
 */
export const isAgentBuilderSpan = (span: tracing.Span, parentContext: api.Context): boolean => {
  const baggage = propagation.getBaggage(parentContext);
  const isFromAgentBuilder =
    baggage?.getEntry(AGENT_BUILDER_OWNER_BAGGAGE_KEY)?.value === AGENT_BUILDER_OWNER_BAGGAGE_VALUE;
  return isFromAgentBuilder && isInferenceSpan(span, parentContext);
};
