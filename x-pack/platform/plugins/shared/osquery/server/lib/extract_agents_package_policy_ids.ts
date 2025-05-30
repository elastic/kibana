/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/spaces-utils';
import type { SavedObjectsClient } from '@kbn/core-saved-objects-api-server-internal';
import type { Agent, AgentPolicy, PackagePolicy } from '@kbn/fleet-plugin/common';
import type { OsqueryAppContext } from './osquery_app_context_services';
import { OSQUERY_INTEGRATION_NAME } from '../../common';

export const extractAgentsPackagePolicyIds = async (
  osqueryContext: OsqueryAppContext,
  soClient: SavedObjectsClient,
  selectedAgents: string[],
  spaceId?: string
): Promise<string[]> => {
  const agents: Agent[] | undefined = await osqueryContext.service
    .getAgentService()
    ?.asInternalScopedUser(spaceId ?? DEFAULT_SPACE_ID)
    .getByIds(selectedAgents);

  if (!agents?.length) return [];

  const agentPolicyIds: string[] = agents
    .map((agent: Agent) => agent.policy_id)
    .filter((id): id is string => Boolean(id));
  if (!agentPolicyIds.length) return [];

  const agentPolicies: AgentPolicy[] | undefined = await osqueryContext.service
    .getAgentPolicyService()
    ?.getByIds(soClient, agentPolicyIds, { withPackagePolicies: true });

  return (
    agentPolicies
      ?.flatMap((policy: AgentPolicy) =>
        (policy.package_policies ?? []).filter(
          (pkg: PackagePolicy) => pkg.package?.name === OSQUERY_INTEGRATION_NAME
        )
      )
      .map((pkg: PackagePolicy) => pkg.id) ?? []
  );
};
