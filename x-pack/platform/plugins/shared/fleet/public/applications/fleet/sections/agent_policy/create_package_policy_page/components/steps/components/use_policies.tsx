/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SO_SEARCH_LIMIT } from '../../../../../../../../../common';
import { useGetAgentPolicies } from '../../../../../../../../hooks';

export const useAllNonManagedAgentPolicies = () => {
  const { data: agentPoliciesData, error: err } = useGetAgentPolicies({
    page: 1,
    perPage: SO_SEARCH_LIMIT,
    sortField: 'name',
    sortOrder: 'asc',
    full: false, // package_policies will always be empty
    noAgentCount: true, // agentPolicy.agents will always be 0,
    kuery: 'ingest-agent-policies.is_managed:false',
  });
  if (err) {
    // eslint-disable-next-line no-console
    console.debug('Could not retrieve agent policies');
  }
  return agentPoliciesData?.items || [];
};
