/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { Agent, fetch } from 'undici';

import { KBN_CERT_PATH, KBN_KEY_PATH } from '@kbn/dev-utils';
import { MOCK_IDP_UIAM_SERVICE_URL } from '@kbn/mock-idp-utils';

/** Exchanges a UIAM service account for an access token, as Kibana does for a bound workload. */
export const exchangeUiamServiceAccountToken = async (id: string): Promise<string> => {
  // UIAM only accepts the exchange from the project's client certificate, and the local one is
  // Kibana's dev certificate.
  const dispatcher = new Agent({
    connect: {
      cert: readFileSync(KBN_CERT_PATH),
      key: readFileSync(KBN_KEY_PATH),
      rejectUnauthorized: false,
    },
  });
  try {
    const response = await fetch(
      `${MOCK_IDP_UIAM_SERVICE_URL}/uiam/api/v1/service-accounts/${encodeURIComponent(
        id
      )}/credentials/_exchange`,
      { method: 'POST', dispatcher }
    );
    if (response.status !== 200) {
      throw new Error(`Failed to exchange test service account ${id}: ${await response.text()}`);
    }
    const { token } = (await response.json()) as { token: string };
    return token;
  } finally {
    await dispatcher.close();
  }
};
