/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest as base } from '@kbn/scout';

interface SessionCredentials {
  makeSession: () => Promise<Record<string, string>>;
  issueExternalBearer: () => Promise<string>;
  waitMs: number;
  secondWaitMs: number;
}

export const apiTest = base.extend<{ sessionCredentials: SessionCredentials }>({
  sessionCredentials: async ({ samlAuth, esClient, config }, use) => {
    const makeSession = async () => ({
      ...(await samlAuth.asInteractiveUser('admin')).cookieHeader,
      'kbn-xsrf': 'true',
      'x-elastic-internal-origin': 'kibana',
    });

    const issueExternalBearer = async () =>
      (
        await esClient.security.getToken({
          grant_type: 'password',
          username: config.auth.username,
          password: config.auth.password,
        })
      ).access_token;

    await use({ makeSession, issueExternalBearer, waitMs: 20_000, secondWaitMs: 20_000 });
  },
});
