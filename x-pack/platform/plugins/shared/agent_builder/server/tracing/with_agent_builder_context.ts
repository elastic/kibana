/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { api } from '@elastic/opentelemetry-node/sdk';
import type { tracing } from '@elastic/opentelemetry-node/sdk';
import { context as otelContext, propagation } from '@opentelemetry/api';
import { isInferenceSpan } from '@kbn/inference-tracing';

export const AGENT_BUILDER_OWNER_BAGGAGE_KEY = 'kibana.agent_builder';
export const AGENT_BUILDER_OWNER_BAGGAGE_VALUE = '1';

/**
 * Executes a function within a context that has the Agent Builder ownership baggage set.
 * All descendant inference spans created inside this context will be tagged as Agent Builder spans,
 * allowing the AgentBuilderSpanProcessor to filter them from other inference consumers.
 */
export const withAgentBuilderContext = <T>(fn: () => T): T => {
  const ctx = otelContext.active();
  const currentBaggage = propagation.getBaggage(ctx) ?? propagation.createBaggage();
  const updatedBaggage = currentBaggage.setEntry(AGENT_BUILDER_OWNER_BAGGAGE_KEY, {
    value: AGENT_BUILDER_OWNER_BAGGAGE_VALUE,
  });
  const updatedContext = propagation.setBaggage(ctx, updatedBaggage);

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
