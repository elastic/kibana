/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest as baseApiTest } from '@kbn/scout';

import type { PkiClientIdentity } from './pki_http2_client';
import { PkiHttp2Client } from './pki_http2_client';

export interface PkiApiTestFixtures {
  /** Opens a new TLS connection to Kibana that presents the given client certificate chain. */
  connectWithClientCertificate: (identity: PkiClientIdentity) => Promise<PkiHttp2Client>;
}

export const apiTest = baseApiTest.extend<PkiApiTestFixtures>({
  connectWithClientCertificate: async ({ config }, use) => {
    const clients: PkiHttp2Client[] = [];
    await use(async (identity) => {
      const client = await PkiHttp2Client.connect(config.hosts.kibana, identity);
      clients.push(client);
      return client;
    });
    clients.forEach((client) => client.close());
  },
});

export * as testData from './constants';
