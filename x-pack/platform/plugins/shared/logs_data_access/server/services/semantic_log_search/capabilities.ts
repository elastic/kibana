/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { REQUIRED_FIELDS } from './constants';

/**
 * Checks that the target exposes every field required by runtime semantic search.
 *
 * Errors are intentionally propagated so callers do not misreport authorization or transport
 * failures as missing fields.
 */
export async function hasRequiredFields(
  esClient: ElasticsearchClient,
  target: string
): Promise<boolean> {
  const response = await esClient.fieldCaps({
    index: target,
    fields: [...REQUIRED_FIELDS],
  });

  return REQUIRED_FIELDS.every((field) => {
    const capabilities = response.fields[field];
    return capabilities !== undefined && Object.keys(capabilities).length > 0;
  });
}

/** The default rerank inference endpoint available in ES 9.3+ */
const RERANK_ENDPOINT = '.rerank-v1-elasticsearch';

/**
 * Detect if the cluster has RERANK capability.
 *
 * Checks if the default rerank endpoint (.rerank-v1-elasticsearch) is available.
 * This endpoint is preconfigured in ES 9.3+ and enables runtime semantic ranking
 * via ES|QL RERANK command.
 */
export async function detectRerankCapability(esClient: ElasticsearchClient): Promise<boolean> {
  try {
    const response = await esClient.inference.get({ inference_id: RERANK_ENDPOINT });
    return (response.endpoints?.length ?? 0) > 0;
  } catch {
    // Endpoint doesn't exist or inference API not available
    return false;
  }
}
