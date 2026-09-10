/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { ApiClientFixture } from '@kbn/scout';
import { ALERTING_V2_INTERNAL_SUGGESTIONS_USER_PROFILES_API_PATH } from '@kbn/alerting-v2-constants';
import {
  ALERTING_V2_ALERTS_ALL_ROLE,
  ALERTING_V2_ALERTS_READ_ROLE,
  ALERTING_V2_RULES_READ_ROLE,
  apiTest,
  NO_ACCESS_ROLE,
  testData,
} from '../fixtures';

const SUGGESTIONS_PATH = ALERTING_V2_INTERNAL_SUGGESTIONS_USER_PROFILES_API_PATH;

/**
 * The suggest API only sees user profiles that have been activated, and a
 * profile is activated when a user logs in interactively. The suite therefore
 * signs in as this role once and searches for the resulting profile.
 */
const SEEDED_PROFILE_ROLE = 'viewer';

const NAME_MAX_LENGTH = 256;
const SIZE_MAX = 100;

interface SuggestedProfile {
  uid: string;
  user: { username: string };
}

const suggestProfiles = (
  apiClient: ApiClientFixture,
  body: Record<string, unknown>,
  headers: Record<string, string>
) => apiClient.post(SUGGESTIONS_PATH, { headers, body, responseType: 'json' });

const getSuggestedUsernames = (body: unknown): string[] =>
  Array.isArray(body) ? (body as SuggestedProfile[]).map(({ user }) => user.username) : [];

/*
 * The authorization tests below use `requestAuth.getApiKeyForCustomRole`, and
 * custom-role auth is not yet supported on Elastic Cloud Hosted. To avoid
 * silent false-positives, the entire suite is restricted to local stateful
 * (classic) until ECH support lands.
 */
apiTest.describe('Suggest user profiles API', { tag: '@local-stateful-classic' }, () => {
  let readerHeaders: Record<string, string>;
  let seededUsername: string;

  apiTest.beforeAll(async ({ requestAuth, samlAuth }) => {
    const readerCredentials = await requestAuth.getApiKeyForCustomRole(
      ALERTING_V2_ALERTS_READ_ROLE
    );
    // This is an internal API reached over POST, so the request needs the
    // shared XSRF / internal-origin headers alongside the API key; without
    // them Kibana rejects the request with a 400 before it hits validation.
    readerHeaders = { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader };

    await samlAuth.asInteractiveUser(SEEDED_PROFILE_ROLE);
    const { username } = await samlAuth.session.getUserData(SEEDED_PROFILE_ROLE);
    seededUsername = username;
  });

  apiTest('matches the profile of a user that has signed in', async ({ apiClient }) => {
    // Profile activation happens asynchronously on login, so poll until the
    // freshly activated profile becomes searchable.
    await expect
      .poll(
        async () => {
          const response = await suggestProfiles(
            apiClient,
            { name: seededUsername },
            readerHeaders
          );
          return getSuggestedUsernames(response.body);
        },
        { timeout: testData.POLL_TIMEOUT_MS, intervals: [testData.POLL_INTERVAL_MS] }
      )
      .toContain(seededUsername);
  });

  apiTest('returns an empty list when nothing matches the search term', async ({ apiClient }) => {
    const response = await suggestProfiles(
      apiClient,
      { name: 'zzzznosuchuserzzzz' },
      readerHeaders
    );

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual([]);
  });

  apiTest('returns an unfiltered list when the body has no name', async ({ apiClient }) => {
    // Backs the assignee picker, which shows a list of users before anything is
    // typed. Profile activation happens asynchronously on login, so poll until
    // the freshly activated profile shows up.
    await expect
      .poll(
        async () => {
          const response = await suggestProfiles(apiClient, { size: 10 }, readerHeaders);
          expect(response).toHaveStatusCode(200);
          return getSuggestedUsernames(response.body);
        },
        { timeout: testData.POLL_TIMEOUT_MS, intervals: [testData.POLL_INTERVAL_MS] }
      )
      .toContain(seededUsername);
  });

  apiTest('returns an unfiltered list when the name is empty', async ({ apiClient }) => {
    const response = await suggestProfiles(apiClient, { name: '' }, readerHeaders);

    expect(response).toHaveStatusCode(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  apiTest('validation: rejects a name longer than the schema limit', async ({ apiClient }) => {
    const response = await suggestProfiles(
      apiClient,
      { name: 'a'.repeat(NAME_MAX_LENGTH + 1) },
      readerHeaders
    );

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('validation: rejects a size above the schema limit', async ({ apiClient }) => {
    const response = await suggestProfiles(
      apiClient,
      { name: seededUsername, size: SIZE_MAX + 1 },
      readerHeaders
    );

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('validation: rejects a negative size', async ({ apiClient }) => {
    const response = await suggestProfiles(
      apiClient,
      { name: seededUsername, size: -1 },
      readerHeaders
    );

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('validation: rejects a fractional size', async ({ apiClient }) => {
    const response = await suggestProfiles(
      apiClient,
      { name: seededUsername, size: 1.5 },
      readerHeaders
    );

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest(
    'authorization: returns 200 for a user with read-only alerts privileges',
    async ({ apiClient }) => {
      const response = await suggestProfiles(apiClient, { name: seededUsername }, readerHeaders);

      expect(response).toHaveStatusCode(200);
    }
  );

  apiTest(
    'authorization: returns 200 for a user with all alerts privileges',
    async ({ apiClient, requestAuth }) => {
      const credentials = await requestAuth.getApiKeyForCustomRole(ALERTING_V2_ALERTS_ALL_ROLE);
      const headers = { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader };

      const response = await suggestProfiles(apiClient, { name: seededUsername }, headers);

      expect(response).toHaveStatusCode(200);
    }
  );

  apiTest(
    'authorization: returns 403 for a user with rules privileges but no alerts privileges',
    async ({ apiClient, requestAuth }) => {
      const credentials = await requestAuth.getApiKeyForCustomRole(ALERTING_V2_RULES_READ_ROLE);
      const headers = { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader };

      const response = await suggestProfiles(apiClient, { name: seededUsername }, headers);

      expect(response).toHaveStatusCode(403);
    }
  );

  apiTest(
    'authorization: returns 403 for a user without alerting_v2 privileges',
    async ({ apiClient, requestAuth }) => {
      const credentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);
      const headers = { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader };

      const response = await suggestProfiles(apiClient, { name: seededUsername }, headers);

      expect(response).toHaveStatusCode(403);
    }
  );
});
