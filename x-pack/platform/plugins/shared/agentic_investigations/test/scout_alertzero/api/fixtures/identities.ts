/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { Client } from '@elastic/elasticsearch';
import type { ApiClientFixture, KbnClient, KibanaRole, ScoutLogger } from '@kbn/scout';

const LOGIN_PATH = 'internal/security/login';
const PASSWORD = 'scout-identity-pass-1234';

export interface TestIdentity {
  username: string;
  /** Stable `u_*` id that conversation ownership and ACL entries record. */
  profileUid: string;
  cookieHeader: Record<string, string>;
}

export interface IdentityFixture {
  roleName: string;
  identities: TestIdentity[];
  /** Removes the users, their API keys and profiles, and the role. Safe to call twice. */
  cleanup: () => Promise<void>;
}

type CleanupStep = [description: string, run: () => Promise<unknown>];

/** Runs every step even when one fails, and says which one did. */
const runCleanupSteps = async (log: ScoutLogger, steps: CleanupStep[]): Promise<void> => {
  const results = await Promise.allSettled(steps.map(([, run]) => run()));
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      log.warning(`Cleanup: failed to ${steps[index][0]}: ${String(result.reason)}`);
    }
  });
};

/**
 * Creates one role and `count` native users holding it, each with a session. Only a session
 * carries the profile uid that ownership and ACL entries record; Basic auth resolves to a realm id.
 */
export const createIdentities = async ({
  esClient,
  kbnClient,
  apiClient,
  log,
  role,
  count,
  prefix,
}: {
  esClient: Client;
  kbnClient: KbnClient;
  apiClient: ApiClientFixture;
  log: ScoutLogger;
  role: KibanaRole;
  count: number;
  prefix: string;
}): Promise<IdentityFixture> => {
  const suffix = randomUUID().slice(0, 8);
  const roleName = `${prefix}_role_${suffix}`;
  const usernames = Array.from({ length: count }, (_, index) => `${prefix}_user${index}_${suffix}`);
  const profileUids: string[] = [];

  const cleanup = async () => {
    // Sessions first, so nothing mints a new key. The workflows engine's per-user API keys outlive
    // the user, so they are swept again last by owner name.
    await runCleanupSteps(
      log,
      usernames.map(
        (username): CleanupStep => [
          `invalidate the sessions of ${username}`,
          () =>
            kbnClient.request({
              method: 'POST',
              path: '/api/security/session/_invalidate',
              body: { match: 'query', query: { provider: { type: 'basic' }, username } },
            }),
        ]
      )
    );
    await runCleanupSteps(log, [
      ...usernames.map(
        (username): CleanupStep => [
          `invalidate the API keys of ${username}`,
          () => esClient.security.invalidateApiKey({ username }),
        ]
      ),
      ...profileUids.map(
        (uid): CleanupStep => [
          `disable the profile ${uid}`,
          () => esClient.security.disableUserProfile({ uid }),
        ]
      ),
    ]);
    await runCleanupSteps(log, [
      ...usernames.map(
        (username): CleanupStep => [
          `delete the user ${username}`,
          () => esClient.security.deleteUser({ username }, { ignore: [404] }),
        ]
      ),
      [
        `delete the role ${roleName}`,
        () =>
          kbnClient.request({
            method: 'DELETE',
            path: `/api/security/role/${roleName}`,
            ignoreErrors: [404],
          }),
      ],
    ]);
    await runCleanupSteps(
      log,
      usernames.map(
        (username): CleanupStep => [
          `invalidate the API keys of ${username} again`,
          () => esClient.security.invalidateApiKey({ username }),
        ]
      )
    );
  };

  try {
    await kbnClient.request({
      method: 'PUT',
      path: `/api/security/role/${roleName}`,
      body: role,
    });

    const identities: TestIdentity[] = [];
    for (const username of usernames) {
      await esClient.security.putUser({ username, password: PASSWORD, roles: [roleName] });
      const { uid } = await esClient.security.activateUserProfile({
        grant_type: 'password',
        username,
        password: PASSWORD,
      });
      profileUids.push(uid);

      const login = await apiClient.post(LOGIN_PATH, {
        headers: {
          'kbn-xsrf': 'scout',
          'x-elastic-internal-origin': 'kibana',
          'elastic-api-version': '1',
        },
        body: {
          providerType: 'basic',
          providerName: 'cloud-basic',
          currentURL: '/',
          params: { username, password: PASSWORD },
        },
        responseType: 'json',
      });
      const setCookie = login.headers['set-cookie'];
      const sid = (Array.isArray(setCookie) ? setCookie : [setCookie]).find((cookie) =>
        cookie?.startsWith('sid=')
      );
      if (login.statusCode !== 200 || !sid) {
        throw new Error(`Setup: login as ${username} failed (status ${login.statusCode})`);
      }
      identities.push({
        username,
        profileUid: uid,
        cookieHeader: { Cookie: sid.split(';')[0] },
      });
    }

    return { roleName, identities, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
};
