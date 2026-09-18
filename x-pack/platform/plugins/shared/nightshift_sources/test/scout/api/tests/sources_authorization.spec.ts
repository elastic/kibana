/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { RoleSessionCredentials } from '@kbn/scout';
import {
  NIGHTSHIFT_MANAGER_ROLE,
  NIGHTSHIFT_READ_ONLY_NO_ES_ROLE,
  NIGHTSHIFT_READ_ONLY_ROLE,
  NO_NIGHTSHIFT_ROLE,
  apiTest,
  cleanupSources,
  createSource,
  createTestIndex,
  deleteSource,
  deleteSourceChecked,
  deleteTestIndex,
  findListed,
  getSource,
  listSources,
  setSourceEnabled,
  testIndexName,
  uniqueSuffix,
  updateSource,
} from '../fixtures';

const TITLE_PREFIX = 'scout-sources-authz';

apiTest.describe(
  'Nightshift sources authorization',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    const suffix = uniqueSuffix();
    const index = testIndexName(suffix);
    const body = {
      title: `${TITLE_PREFIX}-${suffix}`,
      esql: `FROM ${index} | WHERE status >= 500`,
    };
    let manager: RoleSessionCredentials;
    let sourceId: string;

    apiTest.beforeAll(async ({ apiClient, esClient, samlAuth }) => {
      manager = await samlAuth.asInteractiveUser(NIGHTSHIFT_MANAGER_ROLE);
      await createTestIndex(esClient, index);
      const created = await createSource(apiClient, manager.cookieHeader, body);
      expect(created).toHaveStatusCode(200);
      sourceId = created.body.source.id;
    });

    // Scout backs every custom role session with the same underlying role, so the manager
    // session taken in beforeAll no longer carries manager privileges once another role was used.
    apiTest.afterAll(async ({ apiClient, esClient, samlAuth }) => {
      try {
        manager = await samlAuth.asInteractiveUser(NIGHTSHIFT_MANAGER_ROLE);
        await cleanupSources(apiClient, manager.cookieHeader, `${TITLE_PREFIX}-${suffix}`);
      } finally {
        await deleteTestIndex(esClient, index);
      }
    });

    apiTest('lets a Nightshift reader read but not write', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(NIGHTSHIFT_READ_ONLY_ROLE);

      const listed = await listSources(
        apiClient,
        cookieHeader,
        `search=${encodeURIComponent(body.title)}`
      );
      expect(listed).toHaveStatusCode(200);
      expect(findListed(listed.body, sourceId)?.health).toBe('ok');

      const fetched = await getSource(apiClient, cookieHeader, sourceId);
      expect(fetched).toHaveStatusCode(200);
      expect(fetched.body.health).toBe('ok');

      expect(await createSource(apiClient, cookieHeader, body)).toHaveStatusCode(403);
      expect(
        await updateSource(apiClient, cookieHeader, sourceId, { ...body, tags: [] })
      ).toHaveStatusCode(403);
      expect(await setSourceEnabled(apiClient, cookieHeader, sourceId, false)).toHaveStatusCode(
        403
      );
      expect(await setSourceEnabled(apiClient, cookieHeader, sourceId, true)).toHaveStatusCode(403);
      expect(await deleteSource(apiClient, cookieHeader, sourceId)).toHaveStatusCode(403);
    });

    apiTest(
      'reports unknown health to a reader without Elasticsearch view privileges',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(NIGHTSHIFT_READ_ONLY_NO_ES_ROLE);

        const listed = await listSources(
          apiClient,
          cookieHeader,
          `search=${encodeURIComponent(body.title)}`
        );
        expect(listed).toHaveStatusCode(200);
        expect(findListed(listed.body, sourceId)?.health).toBe('unknown');

        const fetched = await getSource(apiClient, cookieHeader, sourceId);
        expect(fetched).toHaveStatusCode(200);
        expect(fetched.body.health).toBe('unknown');
      }
    );

    apiTest('denies a user without Nightshift privileges', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(NO_NIGHTSHIFT_ROLE);

      expect(await listSources(apiClient, cookieHeader)).toHaveStatusCode(403);
      expect(await getSource(apiClient, cookieHeader, sourceId)).toHaveStatusCode(403);
      expect(await createSource(apiClient, cookieHeader, body)).toHaveStatusCode(403);
      expect(await deleteSource(apiClient, cookieHeader, sourceId)).toHaveStatusCode(403);
    });

    apiTest(
      'does not expose a source created in another space',
      async ({ apiClient, apiServices, samlAuth }) => {
        manager = await samlAuth.asInteractiveUser(NIGHTSHIFT_MANAGER_ROLE);
        const spaceId = `ns-src-${suffix}`;
        await apiServices.spaces.create({ id: spaceId, name: spaceId });
        try {
          const created = await createSource(apiClient, manager.cookieHeader, body, { spaceId });
          expect(created).toHaveStatusCode(200);
          const id = created.body.source.id;
          try {
            const listedHere = await listSources(
              apiClient,
              manager.cookieHeader,
              `search=${encodeURIComponent(body.title)}`
            );
            expect(listedHere).toHaveStatusCode(200);
            expect(findListed(listedHere.body, id)).toBeUndefined();
            expect(await getSource(apiClient, manager.cookieHeader, id)).toHaveStatusCode(404);

            const fetchedThere = await getSource(apiClient, manager.cookieHeader, id, { spaceId });
            expect(fetchedThere).toHaveStatusCode(200);
            expect(fetchedThere.body.source.id).toBe(id);
          } finally {
            await deleteSourceChecked(apiClient, manager.cookieHeader, id, { spaceId });
          }
        } finally {
          await apiServices.spaces.delete(spaceId);
        }
      }
    );
  }
);
