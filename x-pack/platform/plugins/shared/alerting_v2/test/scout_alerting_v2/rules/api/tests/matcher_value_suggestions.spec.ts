/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { ApiClientFixture } from '@kbn/scout';
import { ALERTING_V2_INTERNAL_SUGGESTIONS_MATCHER_VALUES_API_PATH } from '@kbn/alerting-v2-constants';
import {
  ALERTING_V2_ALERTS_READ_ROLE,
  ALERTING_V2_RULES_READ_ROLE,
  ALL_ROLE,
  apiTest,
  buildAlertEvent,
  buildCreateRuleData,
  NO_ACCESS_ROLE,
  READ_ROLE,
  testData,
} from '../fixtures';

const SUGGESTIONS_PATH = ALERTING_V2_INTERNAL_SUGGESTIONS_MATCHER_VALUES_API_PATH;
const OTHER_SPACE_ID = 'matcher-suggestions-other-space';

/** Mirrors `MAX_SUGGESTIONS` in the matcher suggestions service. */
const MAX_SUGGESTIONS = 10;
const FIELD_MAX_LENGTH = 256;
const QUERY_MAX_LENGTH = 1024;

interface SuggestOptions {
  headers: Record<string, string>;
  spaceId?: string;
}

const suggestValues = (
  apiClient: ApiClientFixture,
  body: Record<string, unknown>,
  { headers, spaceId }: SuggestOptions
) =>
  apiClient.post(
    spaceId ? `/s/${encodeURIComponent(spaceId)}${SUGGESTIONS_PATH}` : SUGGESTIONS_PATH,
    {
      headers,
      body,
      responseType: 'json',
    }
  );

/*
 * Alert events backing the ES-aggregation branches (`group_hash`, `episode_id`
 * and the `data.*` prefix). Every value is prefixed with `scout` so the
 * prefix-filtered assertions stay exact even if the rule executor writes its
 * own events into `.rule-events` while a test runs.
 *
 * `scout.web-1` and `scoutxweb-2` differ only in the separator: the service
 * builds a Lucene regexp `include` from the query, so a query of `scout.`
 * must match the former and not the latter.
 */
const buildSeededAlertEvents = () => [
  buildAlertEvent({
    group_hash: 'scout.web-1',
    episode: { id: 'scout-episode-web', status: 'active' },
    data: { host: 'scout-web-1', region: 'scout-us-east' },
  }),
  buildAlertEvent({
    group_hash: 'scoutxweb-2',
    episode: { id: 'scout-episode-db', status: 'active' },
    data: { host: 'scout-db-1' },
  }),
];

/*
 * The authorization tests below use `requestAuth.getApiKeyForCustomRole`, and
 * custom-role auth is not yet supported on Elastic Cloud Hosted. To avoid
 * silent false-positives, the entire suite is restricted to local stateful
 * (classic) until ECH support lands.
 */
apiTest.describe('Matcher value suggestions API', { tag: '@local-stateful-classic' }, () => {
  let writerHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth, apiServices }) => {
    const writerCredentials = await requestAuth.getApiKeyForCustomRole(ALL_ROLE);
    // This is an internal API reached over POST, so the request needs the
    // shared XSRF / internal-origin headers alongside the API key; without
    // them Kibana rejects the request with a 400 before it hits validation.
    writerHeaders = { ...testData.COMMON_HEADERS, ...writerCredentials.apiKeyHeader };

    await apiServices.spaces.delete(OTHER_SPACE_ID);
    await apiServices.spaces.create({ id: OTHER_SPACE_ID, name: OTHER_SPACE_ID });
  });

  apiTest.beforeEach(async ({ apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
    await apiServices.alertingV2.ruleEvents.cleanUp();
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
    await apiServices.alertingV2.ruleEvents.cleanUp();
    await apiServices.spaces.delete(OTHER_SPACE_ID);
  });

  apiTest(
    'returns a 200 with an array of suggested values for a static field',
    async ({ apiClient }) => {
      // `episode_status` is backed by static suggestions, so the result is
      // deterministic without seeding any alert events or rules.
      const response = await suggestValues(
        apiClient,
        { field: 'episode_status', query: '' },
        { headers: writerHeaders }
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual(
        expect.arrayContaining(['inactive', 'pending', 'active', 'recovering'])
      );
    }
  );

  apiTest('filters static suggestions by the query prefix', async ({ apiClient }) => {
    const response = await suggestValues(
      apiClient,
      { field: 'episode_status', query: 'a' },
      { headers: writerHeaders }
    );

    expect(response).toHaveStatusCode(200);
    // `inactive` contains but does not start with `a`, so it is filtered out.
    expect(response.body).toStrictEqual(['active']);
  });

  apiTest(
    'rule.name: narrows the saved object search to names matching the query prefix',
    async ({ apiClient, apiServices }) => {
      for (const name of ['scoutcpuhigh', 'scoutcpulow', 'scoutmemory']) {
        await apiServices.alertingV2.rules.create(buildCreateRuleData({ metadata: { name } }));
      }

      const response = await suggestValues(
        apiClient,
        { field: 'rule.name', query: 'scoutcpu' },
        { headers: writerHeaders }
      );

      expect(response).toHaveStatusCode(200);
      expect([...response.body].sort()).toStrictEqual(['scoutcpuhigh', 'scoutcpulow']);
    }
  );

  apiTest(
    'rule.tags: returns the deduplicated tags across all rules',
    async ({ apiClient, apiServices }) => {
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'scouttaggedone', tags: ['scoutprod', 'scoutcpu'] },
        })
      );
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'scouttaggedtwo', tags: ['scoutcpu'] } })
      );

      const response = await suggestValues(
        apiClient,
        { field: 'rule.tags', query: '' },
        { headers: writerHeaders }
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual(['scoutcpu', 'scoutprod']);
    }
  );

  apiTest(
    `rule.tags: caps the result at ${MAX_SUGGESTIONS} suggestions`,
    async ({ apiClient, apiServices }) => {
      const tags = Array.from(
        { length: MAX_SUGGESTIONS + 2 },
        (_, i) => `scout-tag-${String(i).padStart(2, '0')}`
      );

      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'scoutmanytags', tags } })
      );

      const response = await suggestValues(
        apiClient,
        { field: 'rule.tags', query: '' },
        { headers: writerHeaders }
      );

      expect(response).toHaveStatusCode(200);
      // Tags are sorted before slicing, so the cap keeps the first ten.
      expect(response.body).toStrictEqual(tags.slice(0, MAX_SUGGESTIONS));
    }
  );

  apiTest(
    'group_hash: aggregates the values stored on the alert events',
    async ({ apiClient, apiServices }) => {
      await apiServices.alertingV2.ruleEvents.seed(buildSeededAlertEvents());

      const response = await suggestValues(
        apiClient,
        { field: 'group_hash', query: '' },
        { headers: writerHeaders }
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual(expect.arrayContaining(['scout.web-1', 'scoutxweb-2']));
    }
  );

  apiTest(
    'group_hash: escapes regexp characters in the query before filtering',
    async ({ apiClient, apiServices }) => {
      await apiServices.alertingV2.ruleEvents.seed(buildSeededAlertEvents());

      const response = await suggestValues(
        apiClient,
        { field: 'group_hash', query: 'scout.' },
        { headers: writerHeaders }
      );

      expect(response).toHaveStatusCode(200);
      // An unescaped `.` would also match `scoutxweb-2`.
      expect(response.body).toStrictEqual(['scout.web-1']);
    }
  );

  apiTest(
    'episode_id: aggregates the episode ids stored on the alert events',
    async ({ apiClient, apiServices }) => {
      await apiServices.alertingV2.ruleEvents.seed(buildSeededAlertEvents());

      const response = await suggestValues(
        apiClient,
        { field: 'episode_id', query: 'scout-episode-w' },
        { headers: writerHeaders }
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual(['scout-episode-web']);
    }
  );

  apiTest(
    'data.*: aggregates the values of a field nested under data',
    async ({ apiClient, apiServices }) => {
      await apiServices.alertingV2.ruleEvents.seed(buildSeededAlertEvents());

      const response = await suggestValues(
        apiClient,
        { field: 'data.host', query: 'scout-' },
        { headers: writerHeaders }
      );

      expect(response).toHaveStatusCode(200);
      expect([...response.body].sort()).toStrictEqual(['scout-db-1', 'scout-web-1']);
    }
  );

  apiTest('returns an empty list for an unsupported field', async ({ apiClient }) => {
    const response = await suggestValues(
      apiClient,
      { field: 'not_a_matcher_field', query: '' },
      { headers: writerHeaders }
    );

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual([]);
  });

  apiTest(
    'space isolation: only suggests rules that live in the requested space',
    async ({ apiClient, apiServices }) => {
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'scoutdefaultspacerule' } })
      );
      // `rules.cleanUp` only reaches the default space, so this rule lives on
      // until `afterAll` deletes the space along with its saved objects.
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'scoutotherspacerule' } }),
        { spaceId: OTHER_SPACE_ID }
      );

      const defaultSpaceResponse = await suggestValues(
        apiClient,
        { field: 'rule.name', query: '' },
        { headers: writerHeaders }
      );

      expect(defaultSpaceResponse).toHaveStatusCode(200);
      expect(defaultSpaceResponse.body).toStrictEqual(['scoutdefaultspacerule']);

      const otherSpaceResponse = await suggestValues(
        apiClient,
        { field: 'rule.name', query: '' },
        { headers: writerHeaders, spaceId: OTHER_SPACE_ID }
      );

      expect(otherSpaceResponse).toHaveStatusCode(200);
      expect(otherSpaceResponse.body).toStrictEqual(['scoutotherspacerule']);
    }
  );

  apiTest(
    'validation: rejects body with unknown top-level keys (strict schema)',
    async ({ apiClient }) => {
      const response = await suggestValues(
        apiClient,
        { field: 'rule.name', query: 'test', unknownField: 'x' },
        { headers: writerHeaders }
      );

      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
    }
  );

  apiTest(
    'validation: accepts fieldMeta and filters sent by the KQL value suggestion provider',
    async ({ apiClient }) => {
      const response = await suggestValues(
        apiClient,
        {
          field: 'rule.name',
          query: 'test',
          fieldMeta: { name: 'rule.name', type: 'string' },
          filters: [],
        },
        { headers: writerHeaders }
      );

      expect(response).toHaveStatusCode(200);
      expect(Array.isArray(response.body)).toBe(true);
    }
  );

  apiTest('validation: rejects a body without a query', async ({ apiClient }) => {
    const response = await suggestValues(
      apiClient,
      { field: 'rule.name' },
      { headers: writerHeaders }
    );

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('validation: rejects an empty field', async ({ apiClient }) => {
    const response = await suggestValues(
      apiClient,
      { field: '', query: '' },
      { headers: writerHeaders }
    );

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('validation: rejects a field longer than the schema limit', async ({ apiClient }) => {
    const response = await suggestValues(
      apiClient,
      { field: 'a'.repeat(FIELD_MAX_LENGTH + 1), query: '' },
      { headers: writerHeaders }
    );

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('validation: rejects a query longer than the schema limit', async ({ apiClient }) => {
    const response = await suggestValues(
      apiClient,
      { field: 'rule.name', query: 'a'.repeat(QUERY_MAX_LENGTH + 1) },
      { headers: writerHeaders }
    );

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest(
    'authorization: returns 200 for a user with read privileges on rules and alerts',
    async ({ apiClient, requestAuth }) => {
      const credentials = await requestAuth.getApiKeyForCustomRole(READ_ROLE);

      const response = await suggestValues(
        apiClient,
        { field: 'episode_status', query: '' },
        { headers: { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader } }
      );

      expect(response).toHaveStatusCode(200);
    }
  );

  apiTest(
    'authorization: returns 403 for a user with rules privileges but no alerts privileges',
    async ({ apiClient, requestAuth }) => {
      const credentials = await requestAuth.getApiKeyForCustomRole(ALERTING_V2_RULES_READ_ROLE);

      const response = await suggestValues(
        apiClient,
        { field: 'episode_status', query: '' },
        { headers: { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader } }
      );

      expect(response).toHaveStatusCode(403);
    }
  );

  apiTest(
    'authorization: returns 403 for a user with alerts privileges but no rules privileges',
    async ({ apiClient, requestAuth }) => {
      const credentials = await requestAuth.getApiKeyForCustomRole(ALERTING_V2_ALERTS_READ_ROLE);

      const response = await suggestValues(
        apiClient,
        { field: 'episode_status', query: '' },
        { headers: { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader } }
      );

      expect(response).toHaveStatusCode(403);
    }
  );

  apiTest(
    'authorization: returns 403 for a user without alerting_v2 privileges',
    async ({ apiClient, requestAuth }) => {
      const credentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);

      const response = await suggestValues(
        apiClient,
        { field: 'episode_status', query: '' },
        { headers: { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader } }
      );

      expect(response).toHaveStatusCode(403);
    }
  );
});
