/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout';

export const ENRICH_INDEX_NAME = 'test-policy-source-index';
export const ENRICH_POLICY_NAME = 'test-policy-1';

const DELETE_ATTEMPTS = 20;

export const createEnrichPolicy = async (esClient: EsClient) => {
  await esClient.indices.create({
    index: ENRICH_INDEX_NAME,
    mappings: { properties: { name: { type: 'text' } } },
  });
  await esClient.enrich.putPolicy({
    name: ENRICH_POLICY_NAME,
    match: { indices: ENRICH_INDEX_NAME, match_field: 'name', enrich_fields: ['name'] },
  });
};

export const cleanupEnrichPolicy = async (esClient: EsClient) => {
  // Deleting a policy that is mid-execution is rejected while it holds the execution lock: 409, or 429
  // (`es_rejected_execution_exception`). Retry until it goes through.
  const BUSY = [409, 429];
  for (let attempt = 1; ; attempt++) {
    const { statusCode } = await esClient.enrich.deletePolicy(
      { name: ENRICH_POLICY_NAME },
      { ignore: [404, ...BUSY], meta: true }
    );
    if (!BUSY.includes(statusCode)) {
      break;
    }
    if (attempt === DELETE_ATTEMPTS) {
      throw new Error(
        `Enrich policy "${ENRICH_POLICY_NAME}" was still executing after ${DELETE_ATTEMPTS} delete attempts`
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  await esClient.indices.delete({ index: ENRICH_INDEX_NAME }, { ignore: [404] });
};
