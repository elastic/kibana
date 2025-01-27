/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import type { EnrichSummary } from '@elastic/elasticsearch/lib/api/types';
import type { SerializedEnrichPolicy } from '@kbn/index-management-shared-types';
import { getPolicyType } from '../../common/lib';

export const serializeEnrichmentPolicies = (
  policies: EnrichSummary[]
): SerializedEnrichPolicy[] => {
  return policies.map((policy: any) => {
    const policyType = getPolicyType(policy);

    return {
      name: policy.config[policyType].name,
      type: policyType,
      sourceIndices: policy.config[policyType].indices,
      matchField: policy.config[policyType].match_field,
      enrichFields: policy.config[policyType].enrich_fields,
      query: policy.config[policyType].query,
    };
  });
};

const fetchAll = async (client: IScopedClusterClient) => {
  const res = await client.asCurrentUser.enrich.getPolicy();

  return serializeEnrichmentPolicies(res.policies);
};

const create = (
  client: IScopedClusterClient,
  policyName: string,
  serializedPolicy: EnrichSummary['config']
) => {
  return client.asCurrentUser.enrich.putPolicy({
    name: policyName,
    ...serializedPolicy,
  });
};

const execute = (client: IScopedClusterClient, policyName: string) => {
  // Enrich policy executions can last as short as a few seconds to as long as half and hour or longer.
  // In order to prevent the enrich policies UI from timing out, we are disabling `waitForCompletion`.
  return client.asCurrentUser.enrich.executePolicy({
    name: policyName,
    wait_for_completion: false,
  });
};

const remove = (client: IScopedClusterClient, policyName: string) => {
  return client.asCurrentUser.enrich.deletePolicy({ name: policyName });
};

export const enrichPoliciesActions = {
  fetchAll,
  create,
  execute,
  remove,
};
