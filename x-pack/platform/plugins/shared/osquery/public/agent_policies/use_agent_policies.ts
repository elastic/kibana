/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapKeys } from 'lodash';
import { useQuery } from '@kbn/react-query';

import { i18n } from '@kbn/i18n';
import { API_VERSIONS } from '../../common/constants';
import { useKibana } from '../common/lib/kibana';
import { useErrorToast } from '../common/hooks/use_error_toast';
import type { OsqueryAgentPolicy } from './types';

interface IntegrationGroup {
  id: string;
  name: string;
  policyIds: string[];
}

interface AgentPoliciesSelection {
  agentPoliciesById: Record<string, OsqueryAgentPolicy>;
  agentPolicies: OsqueryAgentPolicy[];
  groupsByPackagePolicyId: Record<string, IntegrationGroup>;
  groupIdByPolicyId: Record<string, string>;
}

// Module-level so the reference stays stable: react-query only reuses the
// memoized selection while `options.select` is identity-equal, and an inline
// arrow would hand every consumer a fresh `agentPoliciesById` on each render.
export const selectAgentPolicies = (response: OsqueryAgentPolicy[]): AgentPoliciesSelection => {
  // Group by the single Osquery integration the server reports per agent policy
  // (`package_policy_id` is set only when there is exactly one). An agent policy
  // misconfigured with several Osquery integrations stays ungrouped, instead of
  // transitively merging every integration it touches into one selection.
  const membersByIntegration = new Map<string, { name: string; policyIds: string[] }>();
  for (const {
    id: policyId,
    package_policy_id: integrationId,
    package_policy_name: integrationName,
  } of response) {
    if (!integrationId) continue;
    const integration = membersByIntegration.get(integrationId) ?? {
      name: integrationName ?? integrationId,
      policyIds: [],
    };
    integration.policyIds.push(policyId);
    membersByIntegration.set(integrationId, integration);
  }

  const groupsByPackagePolicyId: Record<string, IntegrationGroup> = {};
  const groupIdByPolicyId: Record<string, string> = {};
  for (const [id, { name, policyIds }] of membersByIntegration) {
    if (policyIds.length < 2) continue;

    groupsByPackagePolicyId[id] = { id, name, policyIds: [...policyIds].sort() };
    for (const policyId of policyIds) {
      groupIdByPolicyId[policyId] = id;
    }
  }

  return {
    agentPoliciesById: mapKeys(response, 'id'),
    agentPolicies: response,
    groupsByPackagePolicyId,
    groupIdByPolicyId,
  };
};

export const useAgentPolicies = () => {
  const { http } = useKibana().services;
  const setErrorToast = useErrorToast();

  return useQuery<OsqueryAgentPolicy[], unknown, AgentPoliciesSelection>(
    ['agentPolicies'],
    () =>
      http.get('/internal/osquery/fleet_wrapper/agent_policies', {
        version: API_VERSIONS.internal.v1,
      }),
    {
      initialData: [],
      keepPreviousData: true,
      select: selectAgentPolicies,
      onSuccess: () => setErrorToast(),
      onError: (error) =>
        setErrorToast(error as Error, {
          title: i18n.translate('xpack.osquery.agent_policies.fetchError', {
            defaultMessage: 'Error while fetching agent policies',
          }),
        }),
    }
  );
};
