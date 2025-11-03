/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentPolicy } from '../types';
import { getNonFipsIntegrations } from '../../../../common/services';

export const getAgentPoliciesWithNonFipsIntegrations = (agentPolicy: AgentPolicy | undefined) => {
  if (!agentPolicy || !agentPolicy?.package_policies) return [];

  return getNonFipsIntegrations(agentPolicy.package_policies);
};
