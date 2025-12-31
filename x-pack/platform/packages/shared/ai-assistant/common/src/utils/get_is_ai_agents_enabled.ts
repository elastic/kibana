/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureFlagsStart } from '@kbn/core-feature-flags-browser';
import { AI_AGENTS_FEATURE_FLAG, AI_AGENTS_FEATURE_FLAG_DEFAULT } from '../..';

/**
 * Checks if the AI Agents feature is enabled via feature flag.
 * @param featureFlags - Feature flags service
 * @returns Boolean indicating if AI Agents are enabled
 */
export function getIsAiAgentsEnabled(featureFlags: FeatureFlagsStart): boolean {
  return featureFlags.getBooleanValue(AI_AGENTS_FEATURE_FLAG, AI_AGENTS_FEATURE_FLAG_DEFAULT);
}
