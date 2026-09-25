/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapKeys } from 'lodash';
import { useQuery } from '@kbn/react-query';

import { i18n } from '@kbn/i18n';
import type { GetAgentPoliciesResponseItem } from '@kbn/fleet-plugin/common';
import { API_VERSIONS } from '../../common/constants';
import { useKibana } from '../common/lib/kibana';
import { useErrorToast } from '../common/hooks/use_error_toast';

interface AgentPoliciesSelection {
  agentPoliciesById: Record<string, GetAgentPoliciesResponseItem>;
  agentPolicies: GetAgentPoliciesResponseItem[];
}

// Module-level so the reference stays stable: react-query only reuses the
// memoized selection while `options.select` is identity-equal, and an inline
// arrow would hand every consumer a fresh `agentPoliciesById` on each render.
const selectAgentPolicies = (response: GetAgentPoliciesResponseItem[]): AgentPoliciesSelection => ({
  agentPoliciesById: mapKeys(response, 'id'),
  agentPolicies: response,
});

export const useAgentPolicies = () => {
  const { http } = useKibana().services;
  const setErrorToast = useErrorToast();

  return useQuery<GetAgentPoliciesResponseItem[], unknown, AgentPoliciesSelection>(
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
