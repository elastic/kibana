/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'node:crypto';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';

const RUN_ID = randomUUID().slice(0, 8);
const SOURCE_INDEX = `scout-esql-views-preview-${RUN_ID}`;

spaceTest.describe('ES|QL View query preview', { tag: tags.stateful.classic }, () => {
  spaceTest.beforeAll(async ({ esClient }) => {
    await esClient.indices.create({ index: SOURCE_INDEX });
    await esClient.index({
      index: SOURCE_INDEX,
      document: { product: 'keyboard', price: 25 },
    });
    await esClient.index({
      index: SOURCE_INDEX,
      document: { product: 'monitor', price: 250 },
      refresh: 'wait_for',
    });
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.esqlViews.goto();
  });

  spaceTest.afterAll(async ({ esClient }) => {
    await esClient.indices.delete({ index: SOURCE_INDEX }, { ignore: [404] });
  });

  spaceTest('runs the form query and renders its real results', async ({ pageObjects }) => {
    const { dataGrid, esqlViews } = pageObjects;

    await esqlViews.openCreateFlyout();
    await esqlViews.fillForm({
      name: `scout-preview-view-${RUN_ID}`,
      query: `FROM ${SOURCE_INDEX} | SORT price | KEEP product, price`,
    });
    await esqlViews.runPreview();

    await expect(dataGrid.getCellValue(0, 'product')).toHaveText('keyboard');
    await expect(dataGrid.getCellValue(0, 'price')).toHaveText('25');
    await expect(dataGrid.getCellValue(1, 'product')).toHaveText('monitor');
    await expect(dataGrid.getCellValue(1, 'price')).toHaveText('250');
  });
});
