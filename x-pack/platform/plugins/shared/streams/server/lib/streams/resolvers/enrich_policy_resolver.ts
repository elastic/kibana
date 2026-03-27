/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EnrichSummary } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  EnrichPolicyResolverMetadata,
  EnrichPolicyResolver,
} from '@kbn/streamlang/types/resolvers';

export const mapEnrichSummaryToMetadata = (
  summary: EnrichSummary
): EnrichPolicyResolverMetadata | null => {
  // Each policy has exactly one of match | geo_match | range in the ES response.
  const policy = summary.config.match ?? summary.config.geo_match ?? summary.config.range;
  if (!policy?.match_field || !policy.enrich_fields) {
    return null;
  }

  const enrichFields = Array.isArray(policy.enrich_fields)
    ? policy.enrich_fields
    : [policy.enrich_fields];
  if (enrichFields.length === 0) {
    return null;
  }

  return {
    matchField: String(policy.match_field),
    enrichFields,
  };
};

/**
 * Resolves enrich policy metadata from Elasticsearch for Streamlang ingest transpilation.
 */
export const createEnrichPolicyResolver = (esClient: ElasticsearchClient): EnrichPolicyResolver => {
  return async (policyName: string): Promise<EnrichPolicyResolverMetadata | null> => {
    const response = await esClient.enrich.getPolicy({ name: policyName }, { ignore: [404] });
    const summary = response.policies?.[0];
    if (!summary) {
      return null;
    }
    return mapEnrichSummaryToMetadata(summary);
  };
};
