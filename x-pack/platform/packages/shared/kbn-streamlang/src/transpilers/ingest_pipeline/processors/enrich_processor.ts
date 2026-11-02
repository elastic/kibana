/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import type { EnrichProcessor } from '../../../../types/processors';
import type { EnrichPolicyResolver } from '../../../../types/resolvers';

/**
 * Converts a Streamlang EnrichProcessor into an Ingest Pipeline enrich processor. Uses a resolver to get the enrich policy metadata.
 * @param processor - The EnrichProcessor to convert.
 * @param resolver - The resolver to get the enrich policy metadata.
 * @returns The Ingest Pipeline enrich processor.
 * @example
 * Input:
 * {
 *   action: 'enrich',
 *   policy_name: 'ip_location',
 *   to: 'location',
 * }
 *
 * Resolver:
 * (policyName: string) => Promise<EnrichPolicyMetadata | null>
 *
 * Return:
 * {
 *   matchField: 'ip',
 *   enrichFields: ['city', 'country'],
 * }
 *
 * Output:
 * {
 *   enrich: {
 *     policy_name: 'ip_location',
 *     field: 'ip',
 *     target_field: 'location',
 *   },
 */
export const processEnrichProcessor = async (
  processor: Omit<EnrichProcessor, 'where' | 'action' | 'to'> & {
    if?: string;
    target_field: string;
    tag?: string;
  },
  resolver: EnrichPolicyResolver
): Promise<IngestProcessorContainer> => {
  const {
    description,
    ignore_failure,
    tag,
    ignore_missing = false,
    override = false,
    policy_name,
    target_field,
  } = processor;

  const policyMetadata = await resolver(policy_name);

  if (!policyMetadata) {
    throw new Error(`Enrich policy ${policy_name} not found through resolver`);
  }

  if (!policyMetadata.matchField) {
    throw new Error(`Enrich policy ${policy_name} match field is required through resolver`);
  }

  const enrichProcessor: IngestProcessorContainer = {
    enrich: {
      policy_name,
      field: policyMetadata.matchField,
      target_field,
      ignore_missing,
      override,
      if: processor.if,
      ignore_failure,
      description,
      tag,
    },
  };

  return enrichProcessor;
};
