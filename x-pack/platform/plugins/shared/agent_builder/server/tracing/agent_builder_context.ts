/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { api } from '@elastic/opentelemetry-node/sdk';
import type { tracing } from '@elastic/opentelemetry-node/sdk';
import { context as otelContext, createContextKey, propagation } from '@opentelemetry/api';
import { isInferenceSpan, CONVERSATION_ID_BAGGAGE_KEY } from '@kbn/inference-tracing';
import type { TracingPrivacySettings } from './privacy_settings';

export const AGENT_BUILDER_OWNER_BAGGAGE_KEY = 'kibana.agent_builder';
export const AGENT_BUILDER_OWNER_BAGGAGE_VALUE = '1';
export const SPACE_ID_BAGGAGE_KEY = 'agent_builder.space_id';
export const DATA_STREAM_NAMESPACE_ATTR = 'data_stream.namespace';

const TRACING_PRIVACY_SETTINGS_KEY = createContextKey('agent_builder.tracing_privacy_settings');

export const setPrivacySettingsOnContext = (
  ctx: api.Context,
  settings: TracingPrivacySettings
): api.Context => ctx.setValue(TRACING_PRIVACY_SETTINGS_KEY, settings);

export const getPrivacySettingsFromContext = (
  ctx: api.Context
): TracingPrivacySettings | undefined => {
  const value = ctx.getValue(TRACING_PRIVACY_SETTINGS_KEY);
  return typeof value === 'object' && value !== null && 'enabled' in value
    ? (value as TracingPrivacySettings)
    : undefined;
};

export function getSpaceIdFromContext(parentContext: api.Context): string {
  const value = propagation.getBaggage(parentContext)?.getEntry(SPACE_ID_BAGGAGE_KEY)?.value;
  return value && value.length > 0 ? value : 'default';
}

/**
 * Executes a function within a context that has the Agent Builder ownership baggage set,
 * along with an optional space ID for data stream routing and privacy settings for export.
 * All descendant inference spans created inside this context will be tagged as Agent Builder spans,
 * allowing the AgentBuilderSpanProcessor to filter them from other inference consumers.
 */
export const withAgentBuilderContext = <T>(
  fn: () => T,
  options?: { spaceId?: string; conversationId?: string; privacySettings?: TracingPrivacySettings }
): T => {
  const ctx = otelContext.active();
  let baggage = propagation.getBaggage(ctx) ?? propagation.createBaggage();
  baggage = baggage.setEntry(AGENT_BUILDER_OWNER_BAGGAGE_KEY, {
    value: AGENT_BUILDER_OWNER_BAGGAGE_VALUE,
  });
  baggage = baggage.setEntry(SPACE_ID_BAGGAGE_KEY, {
    value: options?.spaceId && options.spaceId.length > 0 ? options.spaceId : 'default',
  });
  if (options?.conversationId) {
    baggage = baggage.setEntry(CONVERSATION_ID_BAGGAGE_KEY, { value: options.conversationId });
  }
  let updatedContext = propagation.setBaggage(ctx, baggage);
  if (options?.privacySettings) {
    updatedContext = setPrivacySettingsOnContext(updatedContext, options.privacySettings);
  }

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
