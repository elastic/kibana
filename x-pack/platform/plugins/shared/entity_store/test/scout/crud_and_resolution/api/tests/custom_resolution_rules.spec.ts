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

// Endpoint users are `local` entities, one per user per host; only their
// lowercased user.name matches the AD account.
const LOCAL_USERS_TO_AD_RULE = {
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
        rules?: Record<
          string,
          { definitionFingerprint?: unknown; lastProcessedTimestamp?: unknown }
        >;
      } | null
    )?.rules;
    return rules?.[`custom:${ruleId}`];
  };

  const listRules = async (apiClient: Parameters<typeof triggerMaintainerRun>[0]) => {
    const list = await apiClient.get(ENTITY_STORE_ROUTES.internal.RESOLUTION_CUSTOM_RULES, {
      headers,
      responseType: 'json',
    });
    expect(list.statusCode).toBe(200);
    return (list.body as { rules: Array<{ id: string }> }).rules;
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
    for (const { id } of await listRules(apiClient)) {
      await apiClient.delete(ENTITY_STORE_ROUTES.internal.RESOLUTION_CUSTOM_RULE(id), { headers });
    }
  });

  apiTest(
    'Security all can manage rules, and enabling one needs write on the entity index; Security read can list them but not write',
    async ({ apiClient, samlAuth }) => {
      const securityRole = (
        privilege: 'all' | 'read',
        entityIndexPrivileges = ['read', 'view_index_metadata']
      ) => ({
        elasticsearch: {
          cluster: [],
          indices: [{ names: ['.entities.v2.*'], privileges: entityIndexPrivileges }],
        },
        kibana: [{ base: [], feature: { siemV5: [privilege] }, spaces: ['*'] }],
      });
      // Scout has one custom role per worker, so each asInteractiveUser call redefines it.
      const manager = await samlAuth.asInteractiveUser(securityRole('all'));
      const managerHeaders = { ...manager.cookieHeader, ...INTERNAL_HEADERS };

      const created = await apiClient.post(ENTITY_STORE_ROUTES.internal.RESOLUTION_CUSTOM_RULES, {
        headers: managerHeaders,
        responseType: 'json',
        body: { name: 'Security all rule', ...LOCAL_USERS_TO_AD_RULE },
      });
      expect(created.statusCode).toBe(200);

      const enableRule = () =>
        apiClient.put(ENTITY_STORE_ROUTES.internal.RESOLUTION_CUSTOM_RULE(created.body.id), {
          headers: managerHeaders,
          responseType: 'json',
          body: { enabled: true },
        });
      const enabledWithoutWrite = await enableRule();
      expect(enabledWithoutWrite.statusCode).toBe(403);
      expect(enabledWithoutWrite.body.message).toContain("'write' index privilege");

      await samlAuth.asInteractiveUser(
        securityRole('all', ['read', 'view_index_metadata', 'write'])
      );
      const enabledWithWrite = await enableRule();
      expect(enabledWithWrite.statusCode).toBe(200);
      expect(enabledWithWrite.body.enabled).toBe(true);

      const reader = await samlAuth.asInteractiveUser(securityRole('read'));
      const readerHeaders = { ...reader.cookieHeader, ...INTERNAL_HEADERS };

      const listedByReader = await apiClient.get(
        ENTITY_STORE_ROUTES.internal.RESOLUTION_CUSTOM_RULES,
        { headers: readerHeaders, responseType: 'json' }
      );
      expect(listedByReader.statusCode).toBe(200);
      expect(
        (listedByReader.body as { rules: Array<{ id: string }> }).rules.map(({ id }) => id)
      ).toContain(created.body.id);

      const createdByReader = await apiClient.post(
        ENTITY_STORE_ROUTES.internal.RESOLUTION_CUSTOM_RULES,
        {
          headers: readerHeaders,
          responseType: 'json',
          body: { name: 'Security read rule', ...LOCAL_USERS_TO_AD_RULE },
        }
      );
      expect(createdByReader.statusCode).toBe(403);

      const deletedByReader = await apiClient.delete(
        ENTITY_STORE_ROUTES.internal.RESOLUTION_CUSTOM_RULE(created.body.id),
        { headers: readerHeaders, responseType: 'json' }
      );
      expect(deletedByReader.statusCode).toBe(403);

      await samlAuth.asInteractiveUser(securityRole('all'));
      const deletedByManager = await apiClient.delete(
        ENTITY_STORE_ROUTES.internal.RESOLUTION_CUSTOM_RULE(created.body.id),
        { headers: managerHeaders, responseType: 'json' }
      );
      expect(deletedByManager.statusCode).toBe(200);
    }
  );

  apiTest('rejects invalid rules with a clear error and saves nothing', async ({ apiClient }) => {
    const cases: Array<[string, Record<string, unknown>, string]> = [
      ['pipe injection', { filter: 'true | DROP user.name' }, "Invalid 'filter'"],
      ['unknown field', { match_value: 'TO_LOWER(user.nmae)' }, 'user.nmae'],
      ['non-boolean filter', { filter: 'TO_LOWER(user.name)' }, 'must be [boolean]'],
      ['syntax error', { match_value: 'TO_LOWER(user.name' }, 'ES|QL syntax error'],
      ['malformed namespace', { namespaces: ['Active Directory'] }, "Invalid 'namespaces'"],
      [
        'oversized expression',
        { match_value: `TO_LOWER(user.name)${' '.repeat(2049)}` },
        'match_value',
      ],
      ['unknown request field', { lookup: { index: 'x' } }, 'Excess keys'],
    ];

    for (const [name, override, expectedMessage] of cases) {
      const response = await apiClient.post(ENTITY_STORE_ROUTES.internal.RESOLUTION_CUSTOM_RULES, {
        headers,
        responseType: 'json',
        body: { name: 'invalid', ...LOCAL_USERS_TO_AD_RULE, ...override },
      });
      expect(response.statusCode, name).toBe(400);
      expect(response.body.message, name).toContain(expectedMessage);
    }

    expect(await listRules(apiClient)).toHaveLength(0);
  });

  apiTest(
    'previews, links local users to AD, stops on disable, resumes on enable, and cleans up on delete',
    async ({ apiClient, esClient }) => {
      // Four synchronous maintainer runs; each is slow on a loaded serverless CI node.
      apiTest.setTimeout(180_000);
      let ruleId = '';

      await apiTest.step('seed AD and endpoint users', async () => {
        await seedUser(esClient, AD_USER, 'active_directory', 'JD12345');
        await seedUser(esClient, LAPTOP_USER, 'local', 'jd12345');
        await seedUser(esClient, SECOND_HOST_USER, 'local', 'jd12345');
        await seedUser(esClient, AD_ADMIN, 'active_directory', 'Administrator');
        await seedUser(esClient, LOCAL_ADMIN, 'local', 'Administrator');
      });

      await apiTest.step('preview reports the one group the filter lets through', async () => {
        const preview = await apiClient.post(
          ENTITY_STORE_ROUTES.internal.RESOLUTION_CUSTOM_RULES_PREVIEW,
          { headers, responseType: 'json', body: LOCAL_USERS_TO_AD_RULE }
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
      });

      await apiTest.step('the maintainer applies the saved rule', async () => {
        const created = await apiClient.post(ENTITY_STORE_ROUTES.internal.RESOLUTION_CUSTOM_RULES, {
          headers,
          responseType: 'json',
          body: { name: 'Endpoint local users to AD', ...LOCAL_USERS_TO_AD_RULE, enabled: true },
        });
        expect(created.statusCode).toBe(200);
        ruleId = created.body.id;
        expect(created.body).toMatchObject({
          enabled: true,
          decline_same_namespace_duplicates: true,
        });

        await triggerMaintainerRun(apiClient, headers, 'automated-resolution', { sync: true });
        await waitForResolution(esClient, LAPTOP_USER, AD_USER);
        await waitForResolution(esClient, SECOND_HOST_USER, AD_USER);
        await assertNotResolved(esClient, LOCAL_ADMIN, 1_000);
        const ruleState = await readCustomRuleState(apiClient, ruleId);
        expect(typeof ruleState?.definitionFingerprint).toBe('string');
        expect(typeof ruleState?.lastProcessedTimestamp).toBe('string');
      });

      await apiTest.step('a disabled rule leaves a new laptop entity unlinked', async () => {
        const disabled = await apiClient.put(
          ENTITY_STORE_ROUTES.internal.RESOLUTION_CUSTOM_RULE(ruleId),
          { headers, responseType: 'json', body: { enabled: false } }
        );
        expect(disabled.statusCode).toBe(200);
        expect(disabled.body.enabled).toBe(false);

        await seedUser(esClient, LATE_HOST_USER, 'local', 'jd12345');
        await triggerMaintainerRun(apiClient, headers, 'automated-resolution', { sync: true });
        await assertNotResolved(esClient, LATE_HOST_USER);
      });

      await apiTest.step(
        're-enabled, the rule links that entity into the existing group',
        async () => {
          const watermarkBefore = (await readCustomRuleState(apiClient, ruleId))
            ?.lastProcessedTimestamp;
          const enabled = await apiClient.put(
            ENTITY_STORE_ROUTES.internal.RESOLUTION_CUSTOM_RULE(ruleId),
            { headers, responseType: 'json', body: { enabled: true } }
          );
          expect(enabled.statusCode).toBe(200);

          await triggerMaintainerRun(apiClient, headers, 'automated-resolution', { sync: true });
          await waitForResolution(esClient, LATE_HOST_USER, AD_USER);
          const watermarkAfter = (await readCustomRuleState(apiClient, ruleId))
            ?.lastProcessedTimestamp;
          expect(Date.parse(String(watermarkAfter))).toBeGreaterThan(
            Date.parse(String(watermarkBefore))
          );
        }
      );

      await apiTest.step('delete removes the rule and its saved progress, links stay', async () => {
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
        await waitForResolution(esClient, LAPTOP_USER, AD_USER);
      });
    }
  );
});
