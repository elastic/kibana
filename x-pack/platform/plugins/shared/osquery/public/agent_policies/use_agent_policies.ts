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
  const parents = new Map<string, string>();
  const integrations = new Map<string, { name: string; ownerId: string }>();
  const findRoot = (policyId: string): string => {
    let root = policyId;
    while (parents.has(root)) {
      root = parents.get(root) ?? root;
    }

    let current = policyId;
    while (parents.has(current)) {
      const parent = parents.get(current) ?? root;
      parents.set(current, root);
      current = parent;
    }

    return root;
  };

  for (const policy of response) {
    const {
      id: policyId,
      package_policy_id: integrationId,
      package_policy_name: integrationName,
    } = policy;
    const packagePolicies =
      policy.osquery_package_policies ??
      (integrationId ? [{ id: integrationId, name: integrationName ?? integrationId }] : []);
    for (const { id, name } of packagePolicies) {
      const existing = integrations.get(id);
      if (existing) {
        const root = findRoot(policyId);
        const ownerRoot = findRoot(existing.ownerId);
        if (root !== ownerRoot) {
          parents.set(root, ownerRoot);
        }
      } else {
        integrations.set(id, { name, ownerId: policyId });
      }
    }
  }

  const components = new Map<string, { policyIds: Set<string>; integrationIds: string[] }>();
  for (const { id } of response) {
    const root = findRoot(id);
    const component = components.get(root) ?? { policyIds: new Set<string>(), integrationIds: [] };
    component.policyIds.add(id);
    components.set(root, component);
  }

  for (const [id, { ownerId }] of integrations) {
    components.get(findRoot(ownerId))?.integrationIds.push(id);
  }

  const groupsByPackagePolicyId: Record<string, IntegrationGroup> = {};
  const groupIdByPolicyId: Record<string, string> = {};
  for (const { policyIds, integrationIds } of components.values()) {
    if (policyIds.size < 2) {
      continue;
    }

    // Canonical integration ids keep overlapping groups independent of response order.
    integrationIds.sort();
    const [id] = integrationIds;
    const name = integrationIds
      .map((integration) => integrations.get(integration)?.name)
      .join(', ');
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
