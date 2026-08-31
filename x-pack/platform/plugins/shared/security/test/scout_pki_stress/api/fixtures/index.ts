/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest as baseApiTest } from '@kbn/scout';

import { FIRST_CLIENT_P12 } from './constants';
import { PkiHttp2Client } from './pki_http2_client';

export interface PkiApiTestFixtures {
  pkiHttp2: PkiHttp2Client;
}

export const apiTest = baseApiTest.extend<PkiApiTestFixtures>({
  pkiHttp2: async ({ config }, use) => {
    const client = new PkiHttp2Client(config.hosts.kibana, FIRST_CLIENT_P12);
    await client.connect();
    await use(client);
    client.close();
  },
});

export * as testData from './constants';
