/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'node:crypto';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { createEsqlView, deleteEsqlViews, type TestEsqlView } from '../fixtures/esql_views_api';
import { spaceTest } from '../fixtures';

const RUN_ID = randomUUID().slice(0, 8);
const SOURCE_INDEX = `scout-esql-views-source-${RUN_ID}`;
const INITIAL_VIEWS = [
  {
    name: `scout-esql-views-table-alpha-${RUN_ID}`,
    description: 'Alpha table view',
    query: `FROM ${SOURCE_INDEX}`,
  },
  {
    name: `scout-esql-views-table-beta-${RUN_ID}`,
    description: 'Beta table view',
    query: 'ROW value = 2',
  },
] as const satisfies readonly TestEsqlView[];
const RELOADED_VIEW: TestEsqlView = {
  name: `scout-esql-views-table-reloaded-${RUN_ID}`,
  description: 'Created outside the management UI',
  query: 'ROW value = 3',
};
const VIEW_NAMES = [...INITIAL_VIEWS.map(({ name }) => name), RELOADED_VIEW.name];

spaceTest.describe('ES|QL Views table', { tag: tags.stateful.classic }, () => {
  spaceTest.beforeAll(async ({ esClient }) => {
    await deleteEsqlViews(esClient, VIEW_NAMES);
    await esClient.indices.delete({ index: SOURCE_INDEX }, { ignore: [404] });
    await esClient.indices.create({ index: SOURCE_INDEX });
    await esClient.index({
      index: SOURCE_INDEX,
      document: { message: 'ES|QL Views Scout test' },
      refresh: 'wait_for',
    });
    await Promise.all(INITIAL_VIEWS.map((view) => createEsqlView(esClient, view)));
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.esqlViews.goto();
  });

  spaceTest.afterAll(async ({ esClient }) => {
    await deleteEsqlViews(esClient, VIEW_NAMES);
    await esClient.indices.delete({ index: SOURCE_INDEX }, { ignore: [404] });
  });

  spaceTest(
    'lists, searches, reloads, and opens a view in Discover',
    async ({ esClient, page, pageObjects }) => {
      const { esqlViews, discover } = pageObjects;
      const [alphaView, betaView] = INITIAL_VIEWS;

      await expect(esqlViews.getViewRow(alphaView.name)).toBeVisible();
      await expect(esqlViews.getViewRow(betaView.name)).toBeVisible();

      await esqlViews.search('alpha');
      await expect(esqlViews.getViewRow(alphaView.name)).toBeVisible();
      await expect(esqlViews.getViewRow(betaView.name)).toBeHidden();

      await esqlViews.search('missing-view');
      await expect(esqlViews.noSearchResults).toBeVisible();

      await esqlViews.search('');
      await createEsqlView(esClient, RELOADED_VIEW);
      await expect(esqlViews.getViewRow(RELOADED_VIEW.name)).toBeHidden();
      await esqlViews.reload();
      await expect(esqlViews.getViewRow(RELOADED_VIEW.name)).toBeVisible();

      await esqlViews.openInDiscover(alphaView.name);
      await expect(page).toHaveURL(/\/app\/discover/);
      await expect.poll(() => discover.getEsqlQueryValue()).toBe(`FROM ${alphaView.name}`);
    }
  );
});
