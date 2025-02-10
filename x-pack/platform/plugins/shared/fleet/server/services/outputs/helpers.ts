/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { agentPolicyService } from '../agent_policy';
import { appContextService } from '../app_context';

import { LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE } from '../../constants';
import { SO_SEARCH_LIMIT } from '../../../common/constants';

// Returns agentless policies that may need their data output ID updated
// If outputId is provided, return agentless policies that use that output in addition
// to policies that don't have an output set
export async function findAgentlessPolicies(outputId?: string) {
  const internalSoClientWithoutSpaceExtension =
    appContextService.getInternalUserSOClientWithoutSpaceExtension();

  const agentlessPolicies = await agentPolicyService.list(internalSoClientWithoutSpaceExtension, {
    spaceId: '*',
    perPage: SO_SEARCH_LIMIT,
    kuery: `${LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE}.supports_agentless:true`,
  });

  if (outputId) {
    return agentlessPolicies.items.filter(
      (policy) => policy.data_output_id === outputId || !policy.data_output_id
    );
  } else {
    return agentlessPolicies.items.filter((policy) => !policy.data_output_id);
  }
}
