/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EnrichSummary, EnrichPolicyType } from '@elastic/elasticsearch/lib/api/types';
import type { SerializedEnrichPolicy } from '../types';

export const getPolicyType = (policy: EnrichSummary): EnrichPolicyType => {
  if (policy.config.match) {
    return 'match';
  }

  if (policy.config.geo_match) {
    return 'geo_match';
  }

  if (policy.config.range) {
    return 'range';
  }

  throw new Error('Unknown policy type');
};

export const getESPolicyCreationApiCall = (policyName: string) => {
  return `PUT _enrich/policy/${policyName}`;
};

export const serializeAsESPolicy = (policy: SerializedEnrichPolicy) => {
  const policyType = policy.type as EnrichPolicyType;

  return {
    [policyType]: {
      indices: policy.sourceIndices,
      match_field: policy.matchField,
      enrich_fields: policy.enrichFields,
      query: policy.query,
    },
  };
};
