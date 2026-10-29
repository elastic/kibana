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
  /** Stable `u_*` id of the user's profile. */
  profileUid: string;
  cookieHeader: Record<string, string>;
  /** Removes the user, its API keys and profile, and its role. Safe to call twice. */
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
 * Creates a native user with its own role and a session. `samlAuth.asInteractiveUser` shares one
 * user per worker, so it cannot give two approvers different privileges at once.
 */
export const createIdentity = async ({
  esClient,
  kbnClient,
  apiClient,
  log,
  role,
  prefix,
}: {
  esClient: Client;
  kbnClient: KbnClient;
  apiClient: ApiClientFixture;
  log: ScoutLogger;
  role: KibanaRole;
  prefix: string;
}): Promise<TestIdentity> => {
  const suffix = randomUUID().slice(0, 8);
  const roleName = `${prefix}_role_${suffix}`;
  const username = `${prefix}_user_${suffix}`;
  let profileUid: string | undefined;

  const cleanup = async () => {
    // Session first, so nothing mints a new key. The workflows engine's per-user API keys outlive
    // the user, so they are swept again last by owner name.
    await runCleanupSteps(log, [
      [
        `invalidate the sessions of ${username}`,
        () =>
          kbnClient.request({
            method: 'POST',
            path: '/api/security/session/_invalidate',
            body: { match: 'query', query: { provider: { type: 'basic' }, username } },
          }),
      ],
    ]);
    const uid = profileUid;
    const keysAndProfile: CleanupStep[] = [
      [
        `invalidate the API keys of ${username}`,
        () => esClient.security.invalidateApiKey({ username }),
      ],
    ];
    if (uid !== undefined) {
      keysAndProfile.push([
        `disable the profile ${uid}`,
        () => esClient.security.disableUserProfile({ uid }),
      ]);
    }
    await runCleanupSteps(log, keysAndProfile);
    await runCleanupSteps(log, [
      [
        `delete the user ${username}`,
        () => esClient.security.deleteUser({ username }, { ignore: [404] }),
      ],
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
    await runCleanupSteps(log, [
      [
        `invalidate the API keys of ${username} again`,
        () => esClient.security.invalidateApiKey({ username }),
      ],
    ]);
  };

  try {
    await kbnClient.request({ method: 'PUT', path: `/api/security/role/${roleName}`, body: role });
    await esClient.security.putUser({ username, password: PASSWORD, roles: [roleName] });
    const { uid } = await esClient.security.activateUserProfile({
      grant_type: 'password',
      username,
      password: PASSWORD,
    });
    profileUid = uid;

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

    return { username, profileUid: uid, cookieHeader: { Cookie: sid.split(';')[0] }, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
};
