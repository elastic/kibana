/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExperimentalFeaturesService } from './experimental_features';

/**
 * Kill switch for the agentless policies UI migration: when true (default), the UI reads/writes
 * agentless integration policies through the agentless policies API; when false, every migrated
 * surface falls back to the legacy package-policy/agent-policy APIs. Single source of truth —
 * all agentless-vs-legacy UI forks must consult this instead of reading the flag directly.
 */
export const isAgentlessPoliciesUIEnabled = (): boolean => {
  return ExperimentalFeaturesService.get().enableAgentlessPoliciesUI;
};
