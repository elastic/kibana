/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import {
  ALL_ROLE,
  apiTest,
  buildCreateRuleData,
  NO_ACCESS_ROLE,
  READ_ROLE,
  testData,
} from '../fixtures';

const getRuleNames = (items: Array<{ metadata: { name: string } }>) =>
  items.map((rule) => rule.metadata.name);

/**
 * Build a `?key=value&...` query string for the find-rules endpoint. Using
 * `URLSearchParams` ensures every value is URL-encoded correctly without
 * sprinkling `encodeURIComponent` calls through the test bodies.
 */
const findRulesUrl = (
  params: Record<string, string | number | boolean | undefined> = {}
): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `${testData.RULE_API_PATH}?${qs}` : testData.RULE_API_PATH;
};

/*
 * The authorization tests below use `requestAuth.getApiKeyForCustomRole`, and
 * custom-role auth is not yet supported on Elastic Cloud Hosted. To avoid
 * silent false-positives (ECH currently falls back to `viewer` for unsupported
 * custom roles), the entire suite is restricted to local stateful (classic)
 * until ECH support lands.
 */
apiTest.describe('Find rules API', { tag: '@local-stateful-classic' }, () => {
  let adminCredentials: RoleApiCredentials;
  let adminHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth }) => {
    adminCredentials = await requestAuth.getApiKeyForAdmin();
    adminHeaders = { ...adminCredentials.apiKeyHeader };
  });

  apiTest.beforeEach(async ({ apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
  });

  apiTest('search: should find rules by name prefix', async ({ apiClient, apiServices }) => {
    for (const name of ['HighCpuAlert', 'DiskUsageAlert']) {
      await apiServices.alertingV2.rules.create(buildCreateRuleData({ metadata: { name } }));
    }

    const response = await apiClient.get(findRulesUrl({ search: 'HighCpu', perPage: 100 }), {
      headers: adminHeaders,
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].metadata.name).toBe('HighCpuAlert');
  });

  apiTest('search: should find rules by description prefix', async ({ apiClient, apiServices }) => {
    const rules = [
      { name: 'rule-with-desc', description: 'Monitors memory pressure on production hosts' },
      { name: 'rule-no-match', description: 'Tracks network latency' },
    ];

    for (const { name, description } of rules) {
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name, description } })
      );
    }

    const response = await apiClient.get(findRulesUrl({ search: 'memory', perPage: 100 }), {
      headers: adminHeaders,
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].metadata.name).toBe('rule-with-desc');
  });

  apiTest('search: should AND multiple terms together', async ({ apiClient, apiServices }) => {
    const rules = [
      { name: 'prod-cpu-alert', description: 'Monitors production CPU usage' },
      { name: 'dev-cpu-alert', description: 'Monitors development CPU usage' },
    ];

    for (const { name, description } of rules) {
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name, description } })
      );
    }

    const response = await apiClient.get(findRulesUrl({ search: 'cpu production', perPage: 100 }), {
      headers: adminHeaders,
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].metadata.name).toBe('prod-cpu-alert');
  });

  apiTest(
    'search: should match the name regardless of casing',
    async ({ apiClient, apiServices }) => {
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'HighCpuAlert' } })
      );

      const response = await apiClient.get(findRulesUrl({ search: 'highcpu', perPage: 100 }), {
        headers: adminHeaders,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].metadata.name).toBe('HighCpuAlert');
    }
  );

  apiTest(
    'search: should not error on simple_query_string operators in user input',
    async ({ apiClient, apiServices }) => {
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'safe-rule' } })
      );

      // Unescaped, characters like `(`, `+`, `|` would cause simple_query_string
      // to either parse-error or return arbitrary matches. The server escapes
      // operators so the request always succeeds.
      for (const search of ['(unterminated', '+leading', 'with|pipe']) {
        await apiTest.step(`search="${search}" returns 200`, async () => {
          const response = await apiClient.get(findRulesUrl({ search, perPage: 100 }), {
            headers: adminHeaders,
            responseType: 'json',
          });
          expect(response).toHaveStatusCode(200);
        });
      }
    }
  );

  apiTest(
    'search: should return empty results when no fields match',
    async ({ apiClient, apiServices }) => {
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'some-rule' } })
      );

      const response = await apiClient.get(findRulesUrl({ search: 'nonexistent', perPage: 100 }), {
        headers: adminHeaders,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.items).toHaveLength(0);
      expect(response.body.total).toBe(0);
    }
  );

  apiTest(
    'pagination: should respect page and perPage and report total / current page',
    async ({ apiClient, apiServices }) => {
      for (let i = 0; i < 5; i++) {
        await apiServices.alertingV2.rules.create(
          buildCreateRuleData({ metadata: { name: `paginated-rule-${i}` } })
        );
      }

      await apiTest.step('first page returns the first slice', async () => {
        const firstPage = await apiClient.get(findRulesUrl({ page: 1, perPage: 2 }), {
          headers: adminHeaders,
          responseType: 'json',
        });

        expect(firstPage).toHaveStatusCode(200);
        expect(firstPage.body).toMatchObject({ page: 1, perPage: 2, total: 5 });
        expect(firstPage.body.items).toHaveLength(2);
      });

      await apiTest.step('last page returns the remaining items', async () => {
        const lastPage = await apiClient.get(findRulesUrl({ page: 3, perPage: 2 }), {
          headers: adminHeaders,
          responseType: 'json',
        });

        expect(lastPage).toHaveStatusCode(200);
        expect(lastPage.body).toMatchObject({ page: 3, perPage: 2, total: 5 });
        expect(lastPage.body.items).toHaveLength(1);
      });
    }
  );

  apiTest(
    'pagination: should return zero items when page is beyond the result set',
    async ({ apiClient, apiServices }) => {
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'only-rule' } })
      );

      const response = await apiClient.get(findRulesUrl({ page: 99, perPage: 10 }), {
        headers: adminHeaders,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.total).toBe(1);
      expect(response.body.items).toHaveLength(0);
    }
  );

  apiTest(
    'sort: should sort rules by name in ascending order',
    async ({ apiClient, apiServices }) => {
      for (const name of ['c-rule', 'a-rule', 'b-rule']) {
        await apiServices.alertingV2.rules.create(buildCreateRuleData({ metadata: { name } }));
      }

      const response = await apiClient.get(
        findRulesUrl({ sortField: 'name', sortOrder: 'asc', perPage: 100 }),
        { headers: adminHeaders, responseType: 'json' }
      );

      expect(response).toHaveStatusCode(200);
      expect(getRuleNames(response.body.items)).toStrictEqual(['a-rule', 'b-rule', 'c-rule']);
    }
  );

  apiTest(
    'sort: should sort rules by name in descending order',
    async ({ apiClient, apiServices }) => {
      for (const name of ['c-rule', 'a-rule', 'b-rule']) {
        await apiServices.alertingV2.rules.create(buildCreateRuleData({ metadata: { name } }));
      }

      const response = await apiClient.get(
        findRulesUrl({ sortField: 'name', sortOrder: 'desc', perPage: 100 }),
        { headers: adminHeaders, responseType: 'json' }
      );

      expect(response).toHaveStatusCode(200);
      expect(getRuleNames(response.body.items)).toStrictEqual(['c-rule', 'b-rule', 'a-rule']);
    }
  );

  apiTest('filter: should filter rules by enabled state', async ({ apiClient, apiServices }) => {
    // Rules are created enabled by default. Disable one and assert that the
    // `enabled` filter partitions them correctly.
    const ruleToDisable = await apiServices.alertingV2.rules.create(
      buildCreateRuleData({ metadata: { name: 'rule-becomes-disabled' } })
    );
    await apiServices.alertingV2.rules.create(
      buildCreateRuleData({ metadata: { name: 'rule-stays-enabled' } })
    );

    await apiClient.post(`${testData.RULE_API_PATH}/_bulk_disable`, {
      headers: { ...testData.COMMON_HEADERS, ...adminHeaders },
      body: { ids: [ruleToDisable.id] },
      responseType: 'json',
    });

    await apiTest.step('filter=enabled:true returns only the enabled rule', async () => {
      const response = await apiClient.get(
        findRulesUrl({ filter: 'enabled: true', perPage: 100 }),
        { headers: adminHeaders, responseType: 'json' }
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].metadata.name).toBe('rule-stays-enabled');
    });

    await apiTest.step('filter=enabled:false returns only the disabled rule', async () => {
      const response = await apiClient.get(
        findRulesUrl({ filter: 'enabled: false', perPage: 100 }),
        { headers: adminHeaders, responseType: 'json' }
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].metadata.name).toBe('rule-becomes-disabled');
    });
  });

  apiTest('filter: should filter rules by metadata.tags', async ({ apiClient, apiServices }) => {
    await apiServices.alertingV2.rules.create(
      buildCreateRuleData({ metadata: { name: 'prod-rule', tags: ['production', 'cpu'] } })
    );
    await apiServices.alertingV2.rules.create(
      buildCreateRuleData({ metadata: { name: 'dev-rule', tags: ['development'] } })
    );

    const response = await apiClient.get(
      findRulesUrl({ filter: 'metadata.tags: "production"', perPage: 100 }),
      { headers: adminHeaders, responseType: 'json' }
    );

    expect(response).toHaveStatusCode(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].metadata.name).toBe('prod-rule');
  });

  apiTest(
    'filter: should support compound expressions with AND/OR/NOT',
    async ({ apiClient, apiServices }) => {
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-a', tags: ['production'] } })
      );
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-b', tags: ['production'] } })
      );
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-c', tags: ['development'] } })
      );

      const response = await apiClient.get(
        findRulesUrl({
          filter: 'metadata.tags: "production" AND NOT metadata.name: "rule-a"',
          perPage: 100,
        }),
        { headers: adminHeaders, responseType: 'json' }
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].metadata.name).toBe('rule-b');
    }
  );

  apiTest(
    'filter: should reject filters that reference unknown fields with a 400',
    async ({ apiClient, apiServices }) => {
      // Seed a rule so a 200 response with an empty list would be a regression —
      // the request must fail rather than silently match nothing.
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'should-not-match' } })
      );

      const response = await apiClient.get(
        findRulesUrl({ filter: 'unknown_field: "value"', perPage: 100 }),
        { headers: adminHeaders, responseType: 'json' }
      );

      expect(response).toHaveStatusCode(400);
      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
        // `stringContaining('')` matches any string — the Scout API expect
        // doesn't expose `expect.any(String)`. We just want to assert that the
        // server returned a human-readable message field.
        message: expect.stringContaining(''),
      });
    }
  );

  apiTest('validation: should reject perPage above the maximum', async ({ apiClient }) => {
    const response = await apiClient.get(findRulesUrl({ perPage: 1001 }), {
      headers: adminHeaders,
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body).toMatchObject({ statusCode: 400, error: 'Bad Request' });
  });

  apiTest('validation: should reject perPage below the minimum', async ({ apiClient }) => {
    const response = await apiClient.get(findRulesUrl({ perPage: 0 }), {
      headers: adminHeaders,
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body).toMatchObject({ statusCode: 400, error: 'Bad Request' });
  });

  apiTest('validation: should reject page values below 1', async ({ apiClient }) => {
    const response = await apiClient.get(findRulesUrl({ page: 0 }), {
      headers: adminHeaders,
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body).toMatchObject({ statusCode: 400, error: 'Bad Request' });
  });

  apiTest('validation: should reject non-numeric page values', async ({ apiClient }) => {
    const response = await apiClient.get(findRulesUrl({ page: 'abc' }), {
      headers: adminHeaders,
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body).toMatchObject({ statusCode: 400, error: 'Bad Request' });
  });

  apiTest('validation: should reject unknown sortField values', async ({ apiClient }) => {
    const response = await apiClient.get(findRulesUrl({ sortField: 'unknown-field' }), {
      headers: adminHeaders,
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body).toMatchObject({ statusCode: 400, error: 'Bad Request' });
  });

  apiTest('validation: should reject unknown sortOrder values', async ({ apiClient }) => {
    const response = await apiClient.get(
      findRulesUrl({ sortField: 'name', sortOrder: 'ascending' }),
      { headers: adminHeaders, responseType: 'json' }
    );

    expect(response).toHaveStatusCode(400);
    expect(response.body).toMatchObject({ statusCode: 400, error: 'Bad Request' });
  });

  apiTest(
    'validation: should reject empty search after trimming whitespace',
    async ({ apiClient }) => {
      const response = await apiClient.get(findRulesUrl({ search: '   ' }), {
        headers: adminHeaders,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body).toMatchObject({ statusCode: 400, error: 'Bad Request' });
    }
  );

  apiTest(
    'authorization: should return 200 for a user with read-only alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'visible-to-readers' } })
      );

      const readerCredentials = await requestAuth.getApiKeyForCustomRole(READ_ROLE);

      const response = await apiClient.get(findRulesUrl({ perPage: 100 }), {
        headers: readerCredentials.apiKeyHeader,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].metadata.name).toBe('visible-to-readers');
    }
  );

  apiTest(
    'authorization: should return 200 for a user with full alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'visible-to-writers' } })
      );

      const writerCredentials = await requestAuth.getApiKeyForCustomRole(ALL_ROLE);

      const response = await apiClient.get(findRulesUrl({ perPage: 100 }), {
        headers: writerCredentials.apiKeyHeader,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.items).toHaveLength(1);
    }
  );

  apiTest(
    'authorization: should return 403 for a user without alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'hidden-rule' } })
      );

      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);

      const response = await apiClient.get(findRulesUrl({ perPage: 100 }), {
        headers: noAccessCredentials.apiKeyHeader,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(403);
    }
  );
});
