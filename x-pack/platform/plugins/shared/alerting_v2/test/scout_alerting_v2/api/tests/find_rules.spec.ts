/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
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

apiTest.describe('Find rules API', { tag: tags.stateful.classic }, () => {
  let adminCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    adminCredentials = await requestAuth.getApiKeyForAdmin();
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

    const response = await apiClient.get(`${testData.RULE_API_PATH}?search=HighCpu&perPage=100`, {
      headers: { ...adminCredentials.apiKeyHeader },
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

    const response = await apiClient.get(`${testData.RULE_API_PATH}?search=memory&perPage=100`, {
      headers: { ...adminCredentials.apiKeyHeader },
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

    const search = encodeURIComponent('cpu production');
    const response = await apiClient.get(`${testData.RULE_API_PATH}?search=${search}&perPage=100`, {
      headers: { ...adminCredentials.apiKeyHeader },
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

      const response = await apiClient.get(`${testData.RULE_API_PATH}?search=highcpu&perPage=100`, {
        headers: { ...adminCredentials.apiKeyHeader },
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
        const response = await apiClient.get(
          `${testData.RULE_API_PATH}?search=${encodeURIComponent(search)}&perPage=100`,
          { headers: { ...adminCredentials.apiKeyHeader }, responseType: 'json' }
        );

        expect(response).toHaveStatusCode(200);
      }
    }
  );

  apiTest(
    'search: should return empty results when no fields match',
    async ({ apiClient, apiServices }) => {
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'some-rule' } })
      );

      const response = await apiClient.get(
        `${testData.RULE_API_PATH}?search=nonexistent&perPage=100`,
        { headers: { ...adminCredentials.apiKeyHeader }, responseType: 'json' }
      );

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

      const firstPage = await apiClient.get(`${testData.RULE_API_PATH}?page=1&perPage=2`, {
        headers: { ...adminCredentials.apiKeyHeader },
        responseType: 'json',
      });

      expect(firstPage).toHaveStatusCode(200);
      expect(firstPage.body).toMatchObject({ page: 1, perPage: 2, total: 5 });
      expect(firstPage.body.items).toHaveLength(2);

      const lastPage = await apiClient.get(`${testData.RULE_API_PATH}?page=3&perPage=2`, {
        headers: { ...adminCredentials.apiKeyHeader },
        responseType: 'json',
      });

      expect(lastPage).toHaveStatusCode(200);
      expect(lastPage.body).toMatchObject({ page: 3, perPage: 2, total: 5 });
      expect(lastPage.body.items).toHaveLength(1);
    }
  );

  apiTest(
    'pagination: should return zero items when page is beyond the result set',
    async ({ apiClient, apiServices }) => {
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'only-rule' } })
      );

      const response = await apiClient.get(`${testData.RULE_API_PATH}?page=99&perPage=10`, {
        headers: { ...adminCredentials.apiKeyHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.total).toBe(1);
      expect(response.body.items).toHaveLength(0);
    }
  );

  apiTest('validation: should reject perPage above the maximum', async ({ apiClient }) => {
    const response = await apiClient.get(`${testData.RULE_API_PATH}?perPage=1001`, {
      headers: { ...adminCredentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: should reject perPage below the minimum', async ({ apiClient }) => {
    const response = await apiClient.get(`${testData.RULE_API_PATH}?perPage=0`, {
      headers: { ...adminCredentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: should reject page values below 1', async ({ apiClient }) => {
    const response = await apiClient.get(`${testData.RULE_API_PATH}?page=0`, {
      headers: { ...adminCredentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: should reject non-numeric page values', async ({ apiClient }) => {
    const response = await apiClient.get(`${testData.RULE_API_PATH}?page=abc`, {
      headers: { ...adminCredentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'sort: should sort rules by name in ascending order',
    async ({ apiClient, apiServices }) => {
      for (const name of ['c-rule', 'a-rule', 'b-rule']) {
        await apiServices.alertingV2.rules.create(buildCreateRuleData({ metadata: { name } }));
      }

      const response = await apiClient.get(
        `${testData.RULE_API_PATH}?sortField=name&sortOrder=asc&perPage=100`,
        { headers: { ...adminCredentials.apiKeyHeader }, responseType: 'json' }
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
        `${testData.RULE_API_PATH}?sortField=name&sortOrder=desc&perPage=100`,
        { headers: { ...adminCredentials.apiKeyHeader }, responseType: 'json' }
      );

      expect(response).toHaveStatusCode(200);
      expect(getRuleNames(response.body.items)).toStrictEqual(['c-rule', 'b-rule', 'a-rule']);
    }
  );

  apiTest('validation: should reject unknown sortField values', async ({ apiClient }) => {
    const response = await apiClient.get(`${testData.RULE_API_PATH}?sortField=unknown-field`, {
      headers: { ...adminCredentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: should reject unknown sortOrder values', async ({ apiClient }) => {
    const response = await apiClient.get(
      `${testData.RULE_API_PATH}?sortField=name&sortOrder=ascending`,
      { headers: { ...adminCredentials.apiKeyHeader }, responseType: 'json' }
    );

    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'validation: should reject empty search after trimming whitespace',
    async ({ apiClient }) => {
      const response = await apiClient.get(
        `${testData.RULE_API_PATH}?search=${encodeURIComponent('   ')}`,
        { headers: { ...adminCredentials.apiKeyHeader }, responseType: 'json' }
      );

      expect(response).toHaveStatusCode(400);
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
      headers: { ...testData.COMMON_HEADERS, ...adminCredentials.apiKeyHeader },
      body: { ids: [ruleToDisable.id] },
      responseType: 'json',
    });

    const enabledFilter = encodeURIComponent('enabled: true');
    const enabledResponse = await apiClient.get(
      `${testData.RULE_API_PATH}?filter=${enabledFilter}&perPage=100`,
      { headers: { ...adminCredentials.apiKeyHeader }, responseType: 'json' }
    );

    expect(enabledResponse).toHaveStatusCode(200);
    expect(enabledResponse.body.items).toHaveLength(1);
    expect(enabledResponse.body.items[0].metadata.name).toBe('rule-stays-enabled');

    const disabledFilter = encodeURIComponent('enabled: false');
    const disabledResponse = await apiClient.get(
      `${testData.RULE_API_PATH}?filter=${disabledFilter}&perPage=100`,
      { headers: { ...adminCredentials.apiKeyHeader }, responseType: 'json' }
    );

    expect(disabledResponse).toHaveStatusCode(200);
    expect(disabledResponse.body.items).toHaveLength(1);
    expect(disabledResponse.body.items[0].metadata.name).toBe('rule-becomes-disabled');
  });

  apiTest('filter: should filter rules by metadata.tags', async ({ apiClient, apiServices }) => {
    await apiServices.alertingV2.rules.create(
      buildCreateRuleData({ metadata: { name: 'prod-rule', tags: ['production', 'cpu'] } })
    );
    await apiServices.alertingV2.rules.create(
      buildCreateRuleData({ metadata: { name: 'dev-rule', tags: ['development'] } })
    );

    const filter = encodeURIComponent('metadata.tags: "production"');
    const response = await apiClient.get(`${testData.RULE_API_PATH}?filter=${filter}&perPage=100`, {
      headers: { ...adminCredentials.apiKeyHeader },
      responseType: 'json',
    });

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

      const filter = encodeURIComponent(
        'metadata.tags: "production" AND NOT metadata.name: "rule-a"'
      );
      const response = await apiClient.get(
        `${testData.RULE_API_PATH}?filter=${filter}&perPage=100`,
        { headers: { ...adminCredentials.apiKeyHeader }, responseType: 'json' }
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].metadata.name).toBe('rule-b');
    }
  );

  apiTest(
    'filter: should not return rules when the filter references unknown fields',
    async ({ apiClient, apiServices }) => {
      // Seed a rule so a 200 response with an empty list would be a regression —
      // the request must fail rather than silently match nothing.
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'should-not-match' } })
      );

      const filter = encodeURIComponent('unknown_field: "value"');
      const response = await apiClient.get(
        `${testData.RULE_API_PATH}?filter=${filter}&perPage=100`,
        { headers: { ...adminCredentials.apiKeyHeader }, responseType: 'json' }
      );

      expect(response.statusCode).toBeGreaterThanOrEqual(400);
      expect(response.body.items).toBeUndefined();
    }
  );

  apiTest(
    'authorization: should return 200 for a user with read-only alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'visible-to-readers' } })
      );

      const readerCredentials = await requestAuth.getApiKeyForCustomRole(READ_ROLE);

      const response = await apiClient.get(`${testData.RULE_API_PATH}?perPage=100`, {
        headers: { ...readerCredentials.apiKeyHeader },
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

      const response = await apiClient.get(`${testData.RULE_API_PATH}?perPage=100`, {
        headers: { ...writerCredentials.apiKeyHeader },
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

      const response = await apiClient.get(`${testData.RULE_API_PATH}?perPage=100`, {
        headers: { ...noAccessCredentials.apiKeyHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(403);
    }
  );
});
