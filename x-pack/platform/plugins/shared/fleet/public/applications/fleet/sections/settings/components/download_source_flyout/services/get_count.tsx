/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sendGetAgentPolicies, sendGetAgents } from '../../../../../hooks';
import type { DownloadSource } from '../../../../../types';
import { LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE, SO_SEARCH_LIMIT } from '../../../../../constants';

export async function getCountsForDownloadSource(downloadSource: DownloadSource) {
  let kuery = `${LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE}.download_source_id:"${downloadSource.id}"`;
  if (downloadSource.is_default) {
    kuery += ` or (not ${LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE}.download_source_id:*)`;
  }
  const agentPolicies = await sendGetAgentPolicies({
    kuery,
    page: 1,
    perPage: SO_SEARCH_LIMIT,
  });

  if (agentPolicies.error) {
    throw agentPolicies.error;
  }
  const agentPolicyCount = agentPolicies.data?.items?.length ?? 0;

  let agentCount = 0;
  if (agentPolicyCount > 0) {
    const agents = await sendGetAgents({
      page: 1,
      perPage: 0,
      showInactive: false,
      kuery: agentPolicies.data?.items.map((policy) => `policy_id:"${policy.id}"`).join(' or '),
    });

    if (agents.error) {
      throw agents.error;
    }

    agentCount = agents.data?.total ?? 0;
  }

  return { agentPolicyCount, agentCount };
}
