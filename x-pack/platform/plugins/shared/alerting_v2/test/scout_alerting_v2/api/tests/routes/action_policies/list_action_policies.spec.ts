/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import {
  ACTION_POLICY_CREATED_BY_MAX_LENGTH,
  ACTION_POLICY_PER_PAGE_MAX,
  ACTION_POLICY_SEARCH_MAX_LENGTH,
  ACTION_POLICY_TAG_MAX_LENGTH,
  ACTION_POLICY_TAGS_MAX_COUNT,
  ALL_ROLE,
  apiTest,
  buildCreateActionPolicyData,
  getListActionPoliciesUrl,
  NO_ACCESS_ROLE,
  READ_ROLE,
  testData,
  type AlertingApiServicesFixture,
} from '../../../fixtures';

/**
 * Seeds the three policies (Alpha/Beta/Gamma) used by the search/filter/sort
 * tests below. Returns Alpha so callers can read its `id` / `createdBy` for
 * filter assertions. Scout caps describe nesting at 1, so we seed per-test
 * instead of via a nested describe + beforeAll.
 */
const seedAlphaBetaGamma = async (apiServices: AlertingApiServicesFixture) => {
  const alpha = await apiServices.alertingV2.actionPolicies.create(
    buildCreateActionPolicyData({
      name: 'Alpha Policy',
      description: 'Monitors CPU usage',
      destinations: [{ type: 'workflow', id: 'wf-alpha-001' }],
      tags: ['production', 'critical'],
    })
  );
  await apiServices.alertingV2.actionPolicies.create(
    buildCreateActionPolicyData({
      name: 'Beta Policy',
      description: 'Tracks memory alerts',
      destinations: [{ type: 'workflow', id: 'wf-beta-002' }],
      tags: ['staging'],
    })
  );
  await apiServices.alertingV2.actionPolicies.create(
    buildCreateActionPolicyData({
      name: 'Gamma Policy',
      description: 'Monitors disk space',
      destinations: [{ type: 'workflow', id: 'wf-gamma-003' }],
    })
  );
  return alpha;
};

/*
 * Custom-role auth (`requestAuth.getApiKeyForCustomRole`) is not yet supported
 * on Elastic Cloud Hosted — ECH falls back to `viewer` for unsupported custom
 * roles, which would silently turn 403 assertions into false positives. This
 * suite is restricted to local stateful (classic) until ECH support lands.
 */
apiTest.describe('List action policies API', { tag: '@local-stateful-classic' }, () => {
  // The endpoint requires `actionPolicies.read`, so the default headers used by
  // happy-path/validation tests come from READ_ROLE — the least-privileged
  // role that can call the list endpoint.
  let readerHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth }) => {
    const readerCredentials: RoleApiCredentials = await requestAuth.getApiKeyForCustomRole(
      READ_ROLE
    );
    readerHeaders = { ...readerCredentials.apiKeyHeader };
  });

  apiTest.beforeEach(async ({ apiServices }) => {
    await apiServices.alertingV2.actionPolicies.cleanUp();
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.actionPolicies.cleanUp();
  });

  // ---------- lists (no seed) ----------

  apiTest(
    'list: returns empty list with documented defaults when no policies exist',
    async ({ apiClient }) => {
      const response = await apiClient.get(getListActionPoliciesUrl(), {
        headers: { ...testData.COMMON_HEADERS, ...readerHeaders },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.items).toStrictEqual([]);
      expect(response.body.total).toBe(0);
      expect(response.body.page).toBe(1);
      expect(response.body.perPage).toBe(20);
    }
  );

  apiTest(
    'list: returns created policies with full schema fields per item',
    async ({ apiClient, apiServices }) => {
      await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'policy-1' })
      );
      await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'policy-2' })
      );

      const response = await apiClient.get(getListActionPoliciesUrl(), {
        headers: { ...testData.COMMON_HEADERS, ...readerHeaders },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.total).toBe(2);
      expect(response.body.items).toHaveLength(2);

      const names = response.body.items.map((item: { name: string }) => item.name);
      expect(names).toContain('policy-1');
      expect(names).toContain('policy-2');

      for (const item of response.body.items) {
        expect(typeof item.id).toBe('string');
        expect(typeof item.name).toBe('string');
        expect(typeof item.description).toBe('string');
        expect(Array.isArray(item.destinations)).toBe(true);
        expect(typeof item.createdAt).toBe('string');
        expect(typeof item.updatedAt).toBe('string');
        expect(typeof item.auth.owner).toBe('string');
        expect(typeof item.auth.createdByUser).toBe('boolean');
        // The API key is server-side only and must never be exposed over the wire.
        expect(item.auth.apiKey).toBeUndefined();
      }
    }
  );

  apiTest('pagination: paginates with page+perPage', async ({ apiClient, apiServices }) => {
    await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({ name: 'page-policy-1' })
    );
    await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({ name: 'page-policy-2' })
    );
    await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({ name: 'page-policy-3' })
    );

    const firstPage = await apiClient.get(getListActionPoliciesUrl({ page: 1, perPage: 2 }), {
      headers: { ...testData.COMMON_HEADERS, ...readerHeaders },
    });
    expect(firstPage).toHaveStatusCode(200);
    expect(firstPage.body.items).toHaveLength(2);
    expect(firstPage.body.total).toBe(3);
    expect(firstPage.body.page).toBe(1);
    expect(firstPage.body.perPage).toBe(2);

    const secondPage = await apiClient.get(getListActionPoliciesUrl({ page: 2, perPage: 2 }), {
      headers: { ...testData.COMMON_HEADERS, ...readerHeaders },
    });
    expect(secondPage).toHaveStatusCode(200);
    expect(secondPage.body.items).toHaveLength(1);
    expect(secondPage.body.total).toBe(3);
    expect(secondPage.body.page).toBe(2);
    expect(secondPage.body.perPage).toBe(2);
  });

  // ---------- search (per-test seed of Alpha/Beta/Gamma) ----------

  apiTest('search: matches by name', async ({ apiClient, apiServices }) => {
    await seedAlphaBetaGamma(apiServices);

    const response = await apiClient.get(getListActionPoliciesUrl({ search: 'Alpha' }), {
      headers: { ...testData.COMMON_HEADERS, ...readerHeaders },
    });
    expect(response).toHaveStatusCode(200);
    expect(response.body.total).toBe(1);
    expect(response.body.items[0].name).toBe('Alpha Policy');
  });

  apiTest('search: matches by description', async ({ apiClient, apiServices }) => {
    await seedAlphaBetaGamma(apiServices);

    const response = await apiClient.get(getListActionPoliciesUrl({ search: 'memory' }), {
      headers: { ...testData.COMMON_HEADERS, ...readerHeaders },
    });
    expect(response).toHaveStatusCode(200);
    expect(response.body.total).toBe(1);
    expect(response.body.items[0].name).toBe('Beta Policy');
  });

  apiTest('search: matches by destination id', async ({ apiClient, apiServices }) => {
    await seedAlphaBetaGamma(apiServices);

    const response = await apiClient.get(getListActionPoliciesUrl({ search: 'wf-gamma' }), {
      headers: { ...testData.COMMON_HEADERS, ...readerHeaders },
    });
    expect(response).toHaveStatusCode(200);
    expect(response.body.total).toBe(1);
    expect(response.body.items[0].name).toBe('Gamma Policy');
  });

  apiTest(
    'search: returns multiple matching items for partial term',
    async ({ apiClient, apiServices }) => {
      await seedAlphaBetaGamma(apiServices);

      const response = await apiClient.get(getListActionPoliciesUrl({ search: 'Monitors' }), {
        headers: { ...testData.COMMON_HEADERS, ...readerHeaders },
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.total).toBe(2);
      const names = response.body.items.map((item: { name: string }) => item.name);
      expect(names).toContain('Alpha Policy');
      expect(names).toContain('Gamma Policy');
    }
  );

  apiTest(
    'search: returns empty result for non-matching term',
    async ({ apiClient, apiServices }) => {
      await seedAlphaBetaGamma(apiServices);

      const response = await apiClient.get(getListActionPoliciesUrl({ search: 'nonexistent' }), {
        headers: { ...testData.COMMON_HEADERS, ...readerHeaders },
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.total).toBe(0);
      expect(response.body.items).toStrictEqual([]);
    }
  );

  // ---------- filter ----------

  apiTest('filter: by destinationType=workflow', async ({ apiClient, apiServices }) => {
    await seedAlphaBetaGamma(apiServices);

    const response = await apiClient.get(
      getListActionPoliciesUrl({ destinationType: 'workflow' }),
      {
        headers: { ...testData.COMMON_HEADERS, ...readerHeaders },
      }
    );
    expect(response).toHaveStatusCode(200);
    expect(response.body.total).toBe(3);
  });

  apiTest('filter: by createdBy', async ({ apiClient, apiServices }) => {
    const alpha = await seedAlphaBetaGamma(apiServices);
    expect(alpha.createdBy).toBeDefined();

    const response = await apiClient.get(
      getListActionPoliciesUrl({ createdBy: alpha.createdBy! }),
      {
        headers: { ...testData.COMMON_HEADERS, ...readerHeaders },
      }
    );
    expect(response).toHaveStatusCode(200);
    expect(response.body.total).toBe(3);
  });

  apiTest('filter: by enabled=true and enabled=false', async ({ apiClient, apiServices }) => {
    const alpha = await seedAlphaBetaGamma(apiServices);
    await apiServices.alertingV2.actionPolicies.disable(alpha.id);

    const enabledResponse = await apiClient.get(getListActionPoliciesUrl({ enabled: 'true' }), {
      headers: { ...testData.COMMON_HEADERS, ...readerHeaders },
    });
    expect(enabledResponse).toHaveStatusCode(200);
    expect(enabledResponse.body.total).toBe(2);
    const enabledNames = enabledResponse.body.items.map((item: { name: string }) => item.name);
    expect(enabledNames).not.toContain('Alpha Policy');

    const disabledResponse = await apiClient.get(getListActionPoliciesUrl({ enabled: 'false' }), {
      headers: { ...testData.COMMON_HEADERS, ...readerHeaders },
    });
    expect(disabledResponse).toHaveStatusCode(200);
    expect(disabledResponse.body.total).toBe(1);
    expect(disabledResponse.body.items[0].name).toBe('Alpha Policy');
  });

  // ---------- filter by tags ----------

  apiTest('filter by tags: by a single tag (string)', async ({ apiClient, apiServices }) => {
    await seedAlphaBetaGamma(apiServices);

    const response = await apiClient.get(getListActionPoliciesUrl({ tags: 'production' }), {
      headers: { ...testData.COMMON_HEADERS, ...readerHeaders },
    });
    expect(response).toHaveStatusCode(200);
    expect(response.body.total).toBe(1);
    expect(response.body.items[0].name).toBe('Alpha Policy');
    expect(response.body.items[0].tags).toStrictEqual(['production', 'critical']);
  });

  apiTest('filter by tags: by multiple tags (array)', async ({ apiClient, apiServices }) => {
    await seedAlphaBetaGamma(apiServices);

    const response = await apiClient.get(
      getListActionPoliciesUrl({ tags: ['production', 'staging'] }),
      {
        headers: { ...testData.COMMON_HEADERS, ...readerHeaders },
      }
    );
    expect(response).toHaveStatusCode(200);
    expect(response.body.total).toBe(2);
    const names = response.body.items.map((item: { name: string }) => item.name);
    expect(names).toContain('Alpha Policy');
    expect(names).toContain('Beta Policy');
  });

  apiTest(
    'filter by tags: returns empty when no policies match',
    async ({ apiClient, apiServices }) => {
      await seedAlphaBetaGamma(apiServices);

      const response = await apiClient.get(getListActionPoliciesUrl({ tags: 'nonexistent' }), {
        headers: { ...testData.COMMON_HEADERS, ...readerHeaders },
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.total).toBe(0);
      expect(response.body.items).toStrictEqual([]);
    }
  );

  apiTest(
    'filter by tags: accepts a single tag wrapped in array',
    async ({ apiClient, apiServices }) => {
      await seedAlphaBetaGamma(apiServices);

      const response = await apiClient.get(getListActionPoliciesUrl({ tags: ['staging'] }), {
        headers: { ...testData.COMMON_HEADERS, ...readerHeaders },
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.total).toBe(1);
      expect(response.body.items[0].name).toBe('Beta Policy');
    }
  );

  // ---------- sort ----------

  apiTest('sort: by name ascending', async ({ apiClient, apiServices }) => {
    await seedAlphaBetaGamma(apiServices);

    const response = await apiClient.get(
      getListActionPoliciesUrl({ sortField: 'name', sortOrder: 'asc' }),
      {
        headers: { ...testData.COMMON_HEADERS, ...readerHeaders },
      }
    );
    expect(response).toHaveStatusCode(200);
    const names = response.body.items.map((item: { name: string }) => item.name);
    expect(names).toStrictEqual(['Alpha Policy', 'Beta Policy', 'Gamma Policy']);
  });

  apiTest('sort: by name descending', async ({ apiClient, apiServices }) => {
    await seedAlphaBetaGamma(apiServices);

    const response = await apiClient.get(
      getListActionPoliciesUrl({ sortField: 'name', sortOrder: 'desc' }),
      {
        headers: { ...testData.COMMON_HEADERS, ...readerHeaders },
      }
    );
    expect(response).toHaveStatusCode(200);
    const names = response.body.items.map((item: { name: string }) => item.name);
    expect(names).toStrictEqual(['Gamma Policy', 'Beta Policy', 'Alpha Policy']);
  });

  apiTest('sort: by createdAt ascending', async ({ apiClient, apiServices }) => {
    await seedAlphaBetaGamma(apiServices);

    const response = await apiClient.get(
      getListActionPoliciesUrl({ sortField: 'createdAt', sortOrder: 'asc' }),
      {
        headers: { ...testData.COMMON_HEADERS, ...readerHeaders },
      }
    );
    expect(response).toHaveStatusCode(200);
    expect(response.body.items).toHaveLength(3);
    expect(response.body.items[0].name).toBe('Alpha Policy');
    expect(response.body.items[2].name).toBe('Gamma Policy');
  });

  apiTest('sort: by createdAt descending', async ({ apiClient, apiServices }) => {
    await seedAlphaBetaGamma(apiServices);

    const response = await apiClient.get(
      getListActionPoliciesUrl({ sortField: 'createdAt', sortOrder: 'desc' }),
      {
        headers: { ...testData.COMMON_HEADERS, ...readerHeaders },
      }
    );
    expect(response).toHaveStatusCode(200);
    expect(response.body.items).toHaveLength(3);
    expect(response.body.items[0].name).toBe('Gamma Policy');
    expect(response.body.items[2].name).toBe('Alpha Policy');
  });

  // ---------- combined ----------

  apiTest('combined: search + sort', async ({ apiClient, apiServices }) => {
    await seedAlphaBetaGamma(apiServices);

    const response = await apiClient.get(
      getListActionPoliciesUrl({ search: 'Monitors', sortField: 'name', sortOrder: 'asc' }),
      { headers: { ...testData.COMMON_HEADERS, ...readerHeaders } }
    );
    expect(response).toHaveStatusCode(200);
    expect(response.body.total).toBe(2);
    const names = response.body.items.map((item: { name: string }) => item.name);
    expect(names).toStrictEqual(['Alpha Policy', 'Gamma Policy']);
  });

  apiTest('combined: search + pagination', async ({ apiClient, apiServices }) => {
    await seedAlphaBetaGamma(apiServices);

    const response = await apiClient.get(
      getListActionPoliciesUrl({ search: 'Policy', perPage: 2, page: 1 }),
      {
        headers: { ...testData.COMMON_HEADERS, ...readerHeaders },
      }
    );
    expect(response).toHaveStatusCode(200);
    expect(response.body.total).toBe(3);
    expect(response.body.items).toHaveLength(2);
    expect(response.body.page).toBe(1);
    expect(response.body.perPage).toBe(2);
  });

  // ---------- schema validation ----------

  apiTest('validation: rejects page=0', async ({ apiClient }) => {
    const response = await apiClient.get(getListActionPoliciesUrl({ page: 0 }), {
      headers: { ...testData.COMMON_HEADERS, ...readerHeaders },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: rejects perPage=0', async ({ apiClient }) => {
    const response = await apiClient.get(getListActionPoliciesUrl({ perPage: 0 }), {
      headers: { ...testData.COMMON_HEADERS, ...readerHeaders },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: rejects perPage over the maximum', async ({ apiClient }) => {
    const response = await apiClient.get(
      getListActionPoliciesUrl({ perPage: ACTION_POLICY_PER_PAGE_MAX + 1 }),
      {
        headers: { ...testData.COMMON_HEADERS, ...readerHeaders },
      }
    );
    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: rejects empty search', async ({ apiClient }) => {
    const response = await apiClient.get(getListActionPoliciesUrl({ search: '' }), {
      headers: { ...testData.COMMON_HEADERS, ...readerHeaders },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: rejects search over the maximum length', async ({ apiClient }) => {
    const response = await apiClient.get(
      getListActionPoliciesUrl({ search: 'a'.repeat(ACTION_POLICY_SEARCH_MAX_LENGTH + 1) }),
      {
        headers: { ...testData.COMMON_HEADERS, ...readerHeaders },
      }
    );
    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: rejects unknown destinationType', async ({ apiClient }) => {
    const response = await apiClient.get(getListActionPoliciesUrl({ destinationType: 'email' }), {
      headers: { ...testData.COMMON_HEADERS, ...readerHeaders },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: rejects createdBy over the maximum length', async ({ apiClient }) => {
    const response = await apiClient.get(
      getListActionPoliciesUrl({ createdBy: 'a'.repeat(ACTION_POLICY_CREATED_BY_MAX_LENGTH + 1) }),
      { headers: { ...testData.COMMON_HEADERS, ...readerHeaders } }
    );
    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: rejects unknown enabled value', async ({ apiClient }) => {
    const response = await apiClient.get(getListActionPoliciesUrl({ enabled: 'maybe' }), {
      headers: { ...testData.COMMON_HEADERS, ...readerHeaders },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: rejects unknown sortField', async ({ apiClient }) => {
    const response = await apiClient.get(getListActionPoliciesUrl({ sortField: 'description' }), {
      headers: { ...testData.COMMON_HEADERS, ...readerHeaders },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: rejects unknown sortOrder', async ({ apiClient }) => {
    const response = await apiClient.get(getListActionPoliciesUrl({ sortOrder: 'sideways' }), {
      headers: { ...testData.COMMON_HEADERS, ...readerHeaders },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: rejects more than the maximum number of tags', async ({ apiClient }) => {
    const tooManyTags = Array.from(
      { length: ACTION_POLICY_TAGS_MAX_COUNT + 1 },
      (_, i) => `tag-${i}`
    );
    const response = await apiClient.get(getListActionPoliciesUrl({ tags: tooManyTags }), {
      headers: { ...testData.COMMON_HEADERS, ...readerHeaders },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: rejects tag over the maximum length', async ({ apiClient }) => {
    const response = await apiClient.get(
      getListActionPoliciesUrl({ tags: 'a'.repeat(ACTION_POLICY_TAG_MAX_LENGTH + 1) }),
      {
        headers: { ...testData.COMMON_HEADERS, ...readerHeaders },
      }
    );
    expect(response).toHaveStatusCode(400);
  });

  // ---------- authorization ----------

  apiTest('authorization: 200 with read-only alerting_v2 privileges', async ({ apiClient }) => {
    const response = await apiClient.get(getListActionPoliciesUrl(), {
      headers: { ...testData.COMMON_HEADERS, ...readerHeaders },
    });
    expect(response).toHaveStatusCode(200);
  });

  apiTest(
    'authorization: 200 with full alerting_v2 privileges',
    async ({ apiClient, requestAuth }) => {
      const writerCredentials = await requestAuth.getApiKeyForCustomRole(ALL_ROLE);
      const response = await apiClient.get(getListActionPoliciesUrl(), {
        headers: { ...testData.COMMON_HEADERS, ...writerCredentials.apiKeyHeader },
      });
      expect(response).toHaveStatusCode(200);
    }
  );

  apiTest(
    'authorization: 403 without alerting_v2 privileges',
    async ({ apiClient, requestAuth }) => {
      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);
      const response = await apiClient.get(getListActionPoliciesUrl(), {
        headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
      });
      expect(response).toHaveStatusCode(403);
    }
  );
});
