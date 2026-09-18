/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { RoleSessionCredentials } from '@kbn/scout';
import { getNightshiftSourceViewName, type NightshiftSource } from '@kbn/nightshift-shared';
import {
  NIGHTSHIFT_MANAGER_ROLE,
  apiTest,
  cleanupSources,
  createSource,
  createTestIndex,
  deleteSource,
  deleteTestIndex,
  findListed,
  getSource,
  listSources,
  listedIds,
  readView,
  setSourceEnabled,
  testIndexName,
  uniqueSuffix,
  updateSource,
} from '../fixtures';

const TITLE_PREFIX = 'scout-sources-lifecycle';

apiTest.describe(
  'Nightshift sources lifecycle',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    const suffix = uniqueSuffix();
    const index = testIndexName(suffix);
    let manager: RoleSessionCredentials;

    apiTest.beforeAll(async ({ esClient, samlAuth }) => {
      manager = await samlAuth.asInteractiveUser(NIGHTSHIFT_MANAGER_ROLE);
      await createTestIndex(esClient, index);
    });

    apiTest.afterAll(async ({ apiClient, esClient }) => {
      try {
        await cleanupSources(apiClient, manager.cookieHeader, `${TITLE_PREFIX}-${suffix}`);
      } finally {
        await deleteTestIndex(esClient, index);
      }
    });

    apiTest(
      'creates a source, tracks view health, repairs through PUT and deletes',
      async ({ apiClient, esClient }) => {
        const body = {
          title: `${TITLE_PREFIX}-${suffix}`,
          description: 'nginx 5xx',
          tags: ['nginx'],
          esql: `FROM ${index} | WHERE status >= 500`,
        };

        const created = await createSource(apiClient, manager.cookieHeader, body);
        expect(created).toHaveStatusCode(200);
        const { source } = created.body;
        const viewName = getNightshiftSourceViewName(source.slug);
        expect(source).toMatchObject({
          ...body,
          slug: source.slug,
          view_name: viewName,
          enabled: true,
        });
        expect(viewName).toBe(`$.nightshift.sources.${source.slug}`);
        expect(source.slug).not.toBe(source.id);
        expect(source.esql_updated_at).toBe(source.created_at);

        expect(await readView(esClient, viewName)).toStrictEqual({
          name: viewName,
          query: body.esql,
        });

        const listed = await listSources(
          apiClient,
          manager.cookieHeader,
          `search=${encodeURIComponent(body.title)}`
        );
        expect(listed).toHaveStatusCode(200);
        expect(findListed(listed.body, source.id)).toStrictEqual(source);

        const fetched = await getSource(apiClient, manager.cookieHeader, source.id);
        expect(fetched).toHaveStatusCode(200);
        expect(fetched.body).toStrictEqual({ source, health: 'ok' });

        // Out-of-band deletion is what the health badge exists for.
        await esClient.esql.deleteView({ name: viewName });
        const missing = await getSource(apiClient, manager.cookieHeader, source.id);
        expect(missing.body.health).toBe('view_missing');

        const repaired = await updateSource(apiClient, manager.cookieHeader, source.id, body);
        expect(repaired).toHaveStatusCode(200);
        expect(repaired.body.source.esql_updated_at).toBe(source.esql_updated_at);
        expect((await getSource(apiClient, manager.cookieHeader, source.id)).body.health).toBe(
          'ok'
        );

        await esClient.esql.putView({
          name: viewName,
          query: `FROM ${index} | WHERE status >= 400`,
        });
        const drifted = await getSource(apiClient, manager.cookieHeader, source.id);
        expect(drifted.body.health).toBe('view_drift');

        await updateSource(apiClient, manager.cookieHeader, source.id, body);
        expect((await getSource(apiClient, manager.cookieHeader, source.id)).body.health).toBe(
          'ok'
        );
        expect(await readView(esClient, viewName)).toStrictEqual({
          name: viewName,
          query: body.esql,
        });

        const deleted = await deleteSource(apiClient, manager.cookieHeader, source.id);
        expect(deleted).toHaveStatusCode(200);
        expect(deleted.body).toStrictEqual({ acknowledged: true });
        expect(await getSource(apiClient, manager.cookieHeader, source.id)).toHaveStatusCode(404);
        expect(await readView(esClient, viewName)).toBeUndefined();
      }
    );

    apiTest(
      'allocates a different slug when the view name is already taken',
      async ({ apiClient }) => {
        const title = `${TITLE_PREFIX}-${suffix}-dup`;
        const first = await createSource(apiClient, manager.cookieHeader, {
          title,
          esql: `FROM ${index}`,
        });
        expect(first).toHaveStatusCode(200);
        const second = await createSource(apiClient, manager.cookieHeader, {
          title,
          esql: `FROM ${index}`,
        });
        expect(second).toHaveStatusCode(200);
        expect(second.body.source.view_name).toBe(`${first.body.source.view_name}-2`);
        expect(second.body.source.slug).toBe(`${first.body.source.slug}-2`);
        expect(second.body.source.id).not.toBe(first.body.source.id);

        await deleteSource(apiClient, manager.cookieHeader, first.body.source.id);
        await deleteSource(apiClient, manager.cookieHeader, second.body.source.id);
      }
    );

    apiTest(
      'bumps esql_updated_at only when the query changes',
      async ({ apiClient, esClient }) => {
        const body = {
          title: `${TITLE_PREFIX}-${suffix}-esql`,
          tags: [],
          esql: `FROM ${index} | WHERE status >= 500`,
        };
        const created = await createSource(apiClient, manager.cookieHeader, body);
        expect(created).toHaveStatusCode(200);
        const { source } = created.body;

        const renamed = await updateSource(apiClient, manager.cookieHeader, source.id, {
          ...body,
          title: `${body.title}-renamed`,
          esql: `from ${index}\n| where status >= 500`,
        });
        expect(renamed).toHaveStatusCode(200);
        expect(renamed.body.source.title).toBe(`${body.title}-renamed`);
        expect(renamed.body.source.slug).toBe(source.slug);
        expect(renamed.body.source.view_name).toBe(source.view_name);
        expect(renamed.body.source.esql_updated_at).toBe(source.esql_updated_at);
        expect(renamed.body.source.updated_at).not.toBe(source.updated_at);

        const newEsql = `FROM ${index} | WHERE status >= 400`;
        const requeried = await updateSource(apiClient, manager.cookieHeader, source.id, {
          ...body,
          esql: newEsql,
        });
        expect(requeried).toHaveStatusCode(200);
        expect(requeried.body.source.esql_updated_at).not.toBe(source.esql_updated_at);
        expect(await readView(esClient, source.view_name)).toStrictEqual({
          name: source.view_name,
          query: newEsql,
        });

        await deleteSource(apiClient, manager.cookieHeader, source.id);
      }
    );

    apiTest('flips enabled through _disable and _enable', async ({ apiClient }) => {
      const created = await createSource(apiClient, manager.cookieHeader, {
        title: `${TITLE_PREFIX}-${suffix}-enabled`,
        esql: `FROM ${index}`,
      });
      expect(created).toHaveStatusCode(200);
      const { source } = created.body;

      const disabled = await setSourceEnabled(apiClient, manager.cookieHeader, source.id, false);
      expect(disabled).toHaveStatusCode(200);
      expect(disabled.body.source.enabled).toBe(false);
      expect(disabled.body.source.esql_updated_at).toBe(source.esql_updated_at);

      const onlyDisabled = await listSources(
        apiClient,
        manager.cookieHeader,
        `search=${encodeURIComponent(`${TITLE_PREFIX}-${suffix}-enabled`)}&enabled=false`
      );
      expect(onlyDisabled).toHaveStatusCode(200);
      expect(listedIds(onlyDisabled.body)).toContain(source.id);
      const onlyEnabled = await listSources(
        apiClient,
        manager.cookieHeader,
        `search=${encodeURIComponent(`${TITLE_PREFIX}-${suffix}-enabled`)}&enabled=true`
      );
      expect(onlyEnabled).toHaveStatusCode(200);
      expect(listedIds(onlyEnabled.body)).not.toContain(source.id);

      const enabled = await setSourceEnabled(apiClient, manager.cookieHeader, source.id, true);
      expect(enabled).toHaveStatusCode(200);
      expect(enabled.body.source.enabled).toBe(true);

      const enabledAgain = await listSources(
        apiClient,
        manager.cookieHeader,
        `search=${encodeURIComponent(`${TITLE_PREFIX}-${suffix}-enabled`)}&enabled=true`
      );
      expect(enabledAgain).toHaveStatusCode(200);
      expect(listedIds(enabledAgain.body)).toContain(source.id);
      const disabledGone = await listSources(
        apiClient,
        manager.cookieHeader,
        `search=${encodeURIComponent(`${TITLE_PREFIX}-${suffix}-enabled`)}&enabled=false`
      );
      expect(disabledGone).toHaveStatusCode(200);
      expect(listedIds(disabledGone.body)).not.toContain(source.id);

      await deleteSource(apiClient, manager.cookieHeader, source.id);
    });

    apiTest('paginates sorted by title', async ({ apiClient }) => {
      const titles = ['a', 'b', 'c'].map((letter) => `${TITLE_PREFIX}-${suffix}-page-${letter}`);
      const pagePrefix = `${TITLE_PREFIX}-${suffix}-page-`;
      const ids: string[] = [];
      for (const title of titles) {
        const created = await createSource(apiClient, manager.cookieHeader, {
          title,
          esql: `FROM ${index}`,
        });
        expect(created).toHaveStatusCode(200);
        ids.push(created.body.source.id);
      }

      const listPage = (page: number) =>
        listSources(
          apiClient,
          manager.cookieHeader,
          `search=${encodeURIComponent(pagePrefix)}&page=${page}&per_page=2`
        );

      const firstPage = await listPage(1);
      expect(firstPage).toHaveStatusCode(200);
      expect(firstPage.body).toMatchObject({ page: 1, per_page: 2, total: 3 });
      expect(firstPage.body.sources.map((source: NightshiftSource) => source.title)).toStrictEqual([
        titles[0],
        titles[1],
      ]);

      const secondPage = await listPage(2);
      expect(secondPage.body).toMatchObject({ page: 2, per_page: 2, total: 3 });
      expect(secondPage.body.sources.map((source: NightshiftSource) => source.title)).toStrictEqual(
        [titles[2]]
      );

      const tooMany = await listSources(apiClient, manager.cookieHeader, 'per_page=101');
      expect(tooMany).toHaveStatusCode(400);

      for (const id of ids) {
        await deleteSource(apiClient, manager.cookieHeader, id);
      }
    });

    apiTest('returns 404 for an unknown source', async ({ apiClient }) => {
      const unknownId = randomUUID();
      const response = await getSource(apiClient, manager.cookieHeader, unknownId);
      expect(response).toHaveStatusCode(404);
      expect(response.body.message).toBe(`Source ${unknownId} not found`);
    });

    apiTest('returns 400 for a malformed source id', async ({ apiClient }) => {
      const response = await getSource(apiClient, manager.cookieHeader, 'does-not-exist');
      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toContain('Invalid UUID');
    });
  }
);
