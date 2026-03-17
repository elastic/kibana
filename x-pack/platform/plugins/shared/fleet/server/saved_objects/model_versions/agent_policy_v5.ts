/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectModelDataBackfillFn } from '@kbn/core-saved-objects-server';

import type { AgentPolicy } from '../../../common';

/**
 * Backfill package_agent_version_conditions_v2 from package_agent_version_conditions
 * so existing documents have the new object-mapped field populated (avoids changing
 * the existing flattened field type, which would break mapping compatibility).
 */
export const backfillAgentPolicyPackageAgentVersionConditionsV2: SavedObjectModelDataBackfillFn<
  AgentPolicy,
  AgentPolicy
> = (agentPolicyDoc) => {
  const existing = agentPolicyDoc.attributes.package_agent_version_conditions;
  if (existing !== undefined && existing !== null) {
    agentPolicyDoc.attributes.package_agent_version_conditions_v2 = existing;
  }
  return agentPolicyDoc;
};
