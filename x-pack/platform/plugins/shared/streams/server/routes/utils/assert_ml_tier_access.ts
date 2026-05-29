/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { STREAMS_TIERED_ML_FEATURE } from '../../../common';
import { SecurityError } from '../../lib/streams/errors/security_error';
import type { StreamsServer } from '../../types';

/**
 * Pricing-tier gate for any Streams capability that runs ML / LLM-driven work
 * (heuristic pattern extraction, pipeline-design sub-agent, partition
 * clustering, simulation surfaces shared with those flows).
 *
 * Centralized so HTTP routes AND agent-builder tools that target the same
 * underlying machinery enforce the *same* entitlement; otherwise the agent
 * surface trivially bypasses a check the UI honors.
 *
 * Throws `SecurityError` (which the platform serializes as 403) when the
 * feature is not available on the current pricing tier. Callers that cannot
 * propagate exceptions (e.g. agent-builder tool handlers, which return a
 * structured error result instead of throwing) should call
 * {@link isMlTierAvailable} and shape their own response.
 */
export function assertMlTierAccess({ server }: { server: StreamsServer }): void {
  if (!isMlTierAvailable({ server })) {
    throw new SecurityError('Cannot access API on the current pricing tier');
  }
}

/**
 * Non-throwing variant of {@link assertMlTierAccess} for callers that need to
 * branch (e.g. agent-builder tools returning `ToolResultType.error`).
 */
export function isMlTierAvailable({ server }: { server: StreamsServer }): boolean {
  return server.core.pricing.isFeatureAvailable(STREAMS_TIERED_ML_FEATURE.id);
}
