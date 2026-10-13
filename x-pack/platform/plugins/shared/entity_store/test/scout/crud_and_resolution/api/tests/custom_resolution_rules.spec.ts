/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { GetEntityMaintainersResponse } from '../../../../../common';
import {
  INTERNAL_HEADERS,
  ENTITY_STORE_ROUTES,
  ENTITY_STORE_TAGS,
  LATEST_ALIAS,
} from '../../../common/fixtures/constants';
import {
  clearInstalledEntityStoreDocuments,
  seedUserEntity,
  waitForResolution,
  assertNotResolved,
  triggerMaintainerRun,
} from '../../../common/fixtures/helpers';

// The Elevance case: CrowdStrike endpoint users are `local` entities, one per
// user per host, and only their lowercased user.name matches the AD account.
const ELEVANCE_RULE = {
  namespaces: ['local', 'active_directory'],
  filter:
    'NOT ENDS_WITH(user.name, "$") AND NOT TO_LOWER(user.name) IN ("administrator", "admin", "guest", "defaultaccount")',
  match_value: 'TO_LOWER(user.name)',
};

const AD_USER = 'user:Jane.Doe@example.com@active_directory';
const LAPTOP_USER = 'user:jd12345@HOST-ABC123@local';
const SECOND_HOST_USER = 'user:jd12345@HOST-XYZ789@local';
const LATE_HOST_USER = 'user:jd12345@HOST-LATE01@local';
const AD_ADMIN = 'user:administrator@active_directory';
const LOCAL_ADMIN = 'user:Administrator@HOST-ABC123@local';

// A unique email per entity keeps the built-in email rule from linking anything here.
const seedUser = (
  esClient: Parameters<typeof seedUserEntity>[0],
  entityId: string,
  namespace: string,
  userName: string
) =>
  seedUserEntity(esClient, {
    entityId,
    namespace,
    userName,
    email: `${entityId.replace(/[^a-zA-Z0-9]/g, '-')}@custom-rules.test`,
  });

apiTest.describe('Custom resolution rules', { tag: ENTITY_STORE_TAGS }, () => {
  let headers: Record<string, string>;

  const readCustomRuleState = async (
    apiClient: Parameters<typeof triggerMaintainerRun>[0],
    ruleId: string
  ) => {
    const response = await apiClient.get(
      `${ENTITY_STORE_ROUTES.internal.ENTITY_MAINTAINERS_GET}?ids=automated-resolution`,
      { headers, responseType: 'json' }
    );
    expect(response.statusCode).toBe(200);
    const maintainer = (response.body as GetEntityMaintainersResponse).maintainers.find(
      (item) => item.id === 'automated-resolution'
    );
    const rules = (
      maintainer?.customState as {
        rules?: Record<string, { definitionHash?: unknown; lastProcessedTimestamp?: unknown }>;
      } | null
    )?.rules;
    return rules?.[`custom:${ruleId}`];
  };

  apiTest.beforeAll(async ({ esClient, samlAuth }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    headers = { ...credentials.cookieHeader, ...INTERNAL_HEADERS };
    await clearInstalledEntityStoreDocuments(esClient);
  });

  apiTest.beforeEach(async ({ esClient }) => {
    await esClient.deleteByQuery({
      index: LATEST_ALIAS,
      refresh: true,
      query: { match_all: {} },
      ignore_unavailable: true,
    });
  });

  apiTest.afterEach(async ({ apiClient }) => {
    const list = await apiClient.get(ENTITY_STORE_ROUTES.internal.RESOLUTION_CUSTOM_RULES, {
      headers,
      responseType: 'json',
    });
    for (const { id } of (list.body as { rules: Array<{ id: string }> }).rules) {
      await apiClient.delete(ENTITY_STORE_ROUTES.internal.RESOLUTION_CUSTOM_RULE(id), { headers });
    }
  });

  apiTest('rejects invalid rules with a clear error', async ({ apiClient }) => {
    const create = (body: Record<string, unknown>) =>
      apiClient.post(ENTITY_STORE_ROUTES.internal.RESOLUTION_CUSTOM_RULES, {
        headers,
        responseType: 'json',
        body: { name: 'invalid', ...ELEVANCE_RULE, ...body },
      });

    const injection = await create({ filter: 'true | DROP user.name' });
    expect(injection.statusCode).toBe(400);
    expect(injection.body.message).toContain("'filter'");

    const unknownField = await create({ match_value: 'TO_LOWER(user.nmae)' });
    expect(unknownField.statusCode).toBe(400);
    expect(unknownField.body.message).toContain('user.nmae');

    const nonBooleanFilter = await create({ filter: 'TO_LOWER(user.name)' });
    expect(nonBooleanFilter.statusCode).toBe(400);

    const badNamespace = await create({ namespaces: ['Active Directory'] });
    expect(badNamespace.statusCode).toBe(400);

    const oversized = await create({ match_value: `TO_LOWER(user.name)${' '.repeat(2049)}` });
    expect(oversized.statusCode).toBe(400);

    const unknownKey = await create({ lookup: { index: 'x' } });
    expect(unknownKey.statusCode).toBe(400);
  });

  apiTest(
    'previews, links local users to AD, stops on disable, and cleans up on delete',
    async ({ apiClient, esClient }) => {
      await seedUser(esClient, AD_USER, 'active_directory', 'JD12345');
      await seedUser(esClient, LAPTOP_USER, 'local', 'jd12345');
      await seedUser(esClient, SECOND_HOST_USER, 'local', 'jd12345');
      await seedUser(esClient, AD_ADMIN, 'active_directory', 'Administrator');
      await seedUser(esClient, LOCAL_ADMIN, 'local', 'Administrator');

      // Preview writes nothing and reports the one group the filter lets through.
      const preview = await apiClient.post(
        ENTITY_STORE_ROUTES.internal.RESOLUTION_CUSTOM_RULES_PREVIEW,
        { headers, responseType: 'json', body: ELEVANCE_RULE }
      );
      expect(preview.statusCode).toBe(200);
      expect(preview.body.would_link_groups).toBe(1);
      expect(preview.body.sample).toStrictEqual([
        expect.objectContaining({
          match_value: 'jd12345',
          target: AD_USER,
          aliases: expect.arrayContaining([LAPTOP_USER, SECOND_HOST_USER]),
        }),
      ]);
      await assertNotResolved(esClient, LAPTOP_USER, 1_000);

      const created = await apiClient.post(ENTITY_STORE_ROUTES.internal.RESOLUTION_CUSTOM_RULES, {
        headers,
        responseType: 'json',
        body: { name: 'CrowdStrike local users to AD', ...ELEVANCE_RULE, enabled: true },
      });
      expect(created.statusCode).toBe(200);
      const ruleId: string = created.body.id;
      expect(created.body).toMatchObject({
        enabled: true,
        decline_same_namespace_duplicates: true,
      });

      await triggerMaintainerRun(apiClient, headers, 'automated-resolution', { sync: true });
      await waitForResolution(esClient, LAPTOP_USER, AD_USER);
      await waitForResolution(esClient, SECOND_HOST_USER, AD_USER);
      await assertNotResolved(esClient, LOCAL_ADMIN, 1_000);
      const ruleState = await readCustomRuleState(apiClient, ruleId);
      expect(typeof ruleState?.definitionHash).toBe('string');
      expect(typeof ruleState?.lastProcessedTimestamp).toBe('string');

      // Disabled: a new laptop entity for the same user stays unlinked.
      const disabled = await apiClient.put(
        ENTITY_STORE_ROUTES.internal.RESOLUTION_CUSTOM_RULE(ruleId),
        { headers, responseType: 'json', body: { enabled: false } }
      );
      expect(disabled.statusCode).toBe(200);
      expect(disabled.body.enabled).toBe(false);

      await seedUser(esClient, LATE_HOST_USER, 'local', 'jd12345');
      await triggerMaintainerRun(apiClient, headers, 'automated-resolution', { sync: true });
      await assertNotResolved(esClient, LATE_HOST_USER);

      // Deleted: the rule is gone and its saved progress is dropped on the next run.
      const deleted = await apiClient.delete(
        ENTITY_STORE_ROUTES.internal.RESOLUTION_CUSTOM_RULE(ruleId),
        { headers, responseType: 'json' }
      );
      expect(deleted.statusCode).toBe(200);

      const missing = await apiClient.get(
        ENTITY_STORE_ROUTES.internal.RESOLUTION_CUSTOM_RULE(ruleId),
        { headers, responseType: 'json' }
      );
      expect(missing.statusCode).toBe(404);

      await triggerMaintainerRun(apiClient, headers, 'automated-resolution', { sync: true });
      expect(await readCustomRuleState(apiClient, ruleId)).toBeUndefined();

      // Links the rule already made are kept.
      await waitForResolution(esClient, LAPTOP_USER, AD_USER);
    }
  );
});
