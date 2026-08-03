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
export const TRACES_NAMESPACE_BAGGAGE_KEY = 'agent_builder.traces_namespace';
export const DATA_STREAM_NAMESPACE_ATTR = 'data_stream.namespace';

/**
 * Executes a function within a context that has the Agent Builder ownership baggage set,
 * along with the data stream namespace the resulting spans are routed to.
 * All descendant inference spans created inside this context will be tagged as Agent Builder spans,
 * allowing the AgentBuilderSpanProcessor to filter them from other inference consumers.
 *
 * The namespace is carried as baggage rather than read off span attributes because only the
 * root spans know the agent, while every descendant span needs the same routing.
 */
export const withAgentBuilderContext = <T>(
  fn: () => T,
  options: { spaceId: string; agentId: string; conversationId?: string }
): T => {
  const { spaceId, agentId, conversationId } = options;
  const ctx = otelContext.active();
  let baggage = propagation.getBaggage(ctx) ?? propagation.createBaggage();
  baggage = baggage.setEntry(AGENT_BUILDER_OWNER_BAGGAGE_KEY, {
    value: AGENT_BUILDER_OWNER_BAGGAGE_VALUE,
  });
  baggage = baggage.setEntry(TRACES_NAMESPACE_BAGGAGE_KEY, {
    value: buildAgentBuilderTracesNamespace({ spaceId, agentId }),
  });
  if (conversationId) {
    baggage = baggage.setEntry(CONVERSATION_ID_BAGGAGE_KEY, { value: conversationId });
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
