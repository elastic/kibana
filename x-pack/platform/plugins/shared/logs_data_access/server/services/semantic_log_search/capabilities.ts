/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { isNotFoundError } from '@kbn/es-errors';
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

/** Returns true when the default RERANK inference endpoint is available (preconfigured in ES 9.3+). */
export async function detectRerankCapability(esClient: ElasticsearchClient): Promise<boolean> {
  try {
    const response = await esClient.inference.get({ inference_id: RERANK_ENDPOINT });
    return (response.endpoints?.length ?? 0) > 0;
  } catch (error) {
    // Only a genuine 404 means the endpoint is absent. Authorization (403) and transport (503)
    // failures must propagate so callers do not misreport them as a missing cluster feature —
    // the same principle as `hasRequiredFields` above.
    if (isNotFoundError(error)) {
      return false;
    }
    throw error;
  }
}
