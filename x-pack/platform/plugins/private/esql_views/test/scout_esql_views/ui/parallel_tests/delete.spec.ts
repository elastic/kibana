/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'node:crypto';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  createEsqlView,
  deleteEsqlViews,
  getEsqlView,
  type TestEsqlView,
} from '../fixtures/esql_views_api';
import { spaceTest } from '../fixtures';

const RUN_ID = randomUUID().slice(0, 8);
const VIEWS = [
  { name: `scout-esql-views-delete-single-${RUN_ID}`, query: 'ROW value = 1' },
  { name: `scout-esql-views-delete-bulk-one-${RUN_ID}`, query: 'ROW value = 2' },
  { name: `scout-esql-views-delete-bulk-two-${RUN_ID}`, query: 'ROW value = 3' },
] as const satisfies readonly TestEsqlView[];
const VIEW_NAMES = VIEWS.map(({ name }) => name);

spaceTest.describe('ES|QL View deletion', { tag: tags.stateful.classic }, () => {
  spaceTest.beforeAll(async ({ esClient }) => {
    await deleteEsqlViews(esClient, VIEW_NAMES);
    await Promise.all(VIEWS.map((view) => createEsqlView(esClient, view)));
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.esqlViews.goto();
  });

  spaceTest.afterAll(async ({ esClient }) => {
    await deleteEsqlViews(esClient, VIEW_NAMES);
  });

  spaceTest('deletes one view and multiple selected views', async ({ esClient, pageObjects }) => {
    const { esqlViews } = pageObjects;
    const [singleView, firstBulkView, secondBulkView] = VIEWS;

    await esqlViews.requestSingleDelete(singleView.name);
    await expect(esqlViews.deleteModal).toContainText(`Delete view "${singleView.name}"?`);
    await esqlViews.confirmDelete();
    await expect(esqlViews.getViewRow(singleView.name)).toBeHidden();
    await expect.poll(() => getEsqlView(esClient, singleView.name)).toBeUndefined();

    await esqlViews.selectView(firstBulkView.name);
    await esqlViews.selectView(secondBulkView.name);
    await esqlViews.requestBulkDelete();
    await expect(esqlViews.deleteModal).toContainText('Delete 2 views?');
    await esqlViews.confirmDelete();

    await expect(esqlViews.getViewRow(firstBulkView.name)).toBeHidden();
    await expect(esqlViews.getViewRow(secondBulkView.name)).toBeHidden();
    await expect.poll(() => getEsqlView(esClient, firstBulkView.name)).toBeUndefined();
    await expect.poll(() => getEsqlView(esClient, secondBulkView.name)).toBeUndefined();
  });
});
