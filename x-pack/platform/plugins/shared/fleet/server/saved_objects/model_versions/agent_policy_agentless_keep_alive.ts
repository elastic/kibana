/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectModelDataBackfillFn } from '@kbn/core-saved-objects-server';

import type { AgentPolicy } from '../../../common';

export const backfillAgentPolicyAgentlessKeepAlive: SavedObjectModelDataBackfillFn<
  AgentPolicy,
  AgentPolicy
> = (agentPolicyDoc) => {
  if (
    agentPolicyDoc.attributes.supports_agentless &&
    !agentPolicyDoc.attributes.keep_monitoring_alive
  ) {
    agentPolicyDoc.attributes.keep_monitoring_alive = true;
    agentPolicyDoc.attributes.revision++;
  }

  return agentPolicyDoc;
};
