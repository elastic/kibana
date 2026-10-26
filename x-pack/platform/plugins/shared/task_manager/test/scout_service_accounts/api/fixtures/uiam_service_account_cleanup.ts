/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Agent, fetch } from 'undici';

import {
  generateCosmosDBApiRequestHeaders,
  MOCK_IDP_UIAM_COSMOS_DB_COLLECTION_ORGANIZATION_SERVICE_ACCOUNTS,
  MOCK_IDP_UIAM_COSMOS_DB_NAME,
  MOCK_IDP_UIAM_COSMOS_DB_URL,
} from '@kbn/mock-idp-utils';

/** Deletes only this test's account from the local UIAM emulator. */
export const deleteUiamServiceAccount = async (id: string): Promise<void> => {
  const resource = `dbs/${MOCK_IDP_UIAM_COSMOS_DB_NAME}/colls/${MOCK_IDP_UIAM_COSMOS_DB_COLLECTION_ORGANIZATION_SERVICE_ACCOUNTS}/docs/${id}`;
  const dispatcher = new Agent({ connect: { rejectUnauthorized: false } });
  try {
    // The seeded organization key cannot revoke project accounts in the local UIAM image.
    const response = await fetch(`${MOCK_IDP_UIAM_COSMOS_DB_URL}/${resource}`, {
      method: 'DELETE',
      dispatcher,
      headers: {
        ...generateCosmosDBApiRequestHeaders('DELETE', 'docs', resource),
        'x-ms-documentdb-partitionkey': JSON.stringify([id]),
      },
    });
    if (response.status !== 204) {
      throw new Error(`Failed to delete test service account ${id}: ${await response.text()}`);
    }
    await response.body?.cancel();
  } finally {
    await dispatcher.close();
  }
};
