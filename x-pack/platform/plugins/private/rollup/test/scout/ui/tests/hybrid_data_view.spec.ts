/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import {
  test,
  testData,
  createMockRollupIndex,
  deleteAllRollupJobs,
  seedHybridRollup,
  cleanupHybridIndices,
  createAlias,
} from '../fixtures';

const { HYBRID } = testData;
const seed = {
  sourcePrefix: HYBRID.ROLLUP_SOURCE_PREFIX,
  targetIndex: HYBRID.ROLLUP_TARGET_INDEX,
  regularPrefix: HYBRID.REGULAR_INDEX_PREFIX,
};

// A rollup job name can never be reused (even after delete), so make it unique per run.
const uniqueJobName = () => `hybrid-rollup-${Date.now()}`;

const expectedFields = [...HYBRID.EXPECTED_FIELDS].sort();

// Local + cloud stateful: rollup does not exist on serverless.
test.describe(
  'Rollup jobs - hybrid data view',
  { tag: ['@local-stateful-classic', '@cloud-stateful-classic'] },
  () => {
    test.beforeEach(async ({ browserAuth, esClient, pageObjects }) => {
      // Rollup jobs and indices are cluster-global; clear leftovers, then seed a rollup job whose
      // target index a data view can span alongside a regular index.
      await deleteAllRollupJobs(esClient);
      await cleanupHybridIndices(esClient, seed);
      await createMockRollupIndex(esClient);
      await seedHybridRollup(esClient, uniqueJobName(), seed);
      await browserAuth.loginAsAdmin();
      await pageObjects.dataViewsManagement.goto();
    });

    test.afterEach(async ({ esClient, kbnClient }) => {
      await kbnClient.savedObjects.clean({ types: ['index-pattern'] });
      await deleteAllRollupJobs(esClient);
      await cleanupHybridIndices(esClient, seed);
    });

    test('creates a rollup data view over regular + rollup indices with the Rollup badge', async ({
      pageObjects,
    }) => {
      test.setTimeout(120_000);
      const { dataViewsManagement, rollupDataView } = pageObjects;

      await test.step('create the hybrid rollup data view', async () => {
        await dataViewsManagement.openCreateWizard();
        await rollupDataView.fillRollupDataView(HYBRID.DATA_VIEW_PATTERN, '@timestamp');
      });

      await test.step('the data view is tagged Rollup in the list', async () => {
        await dataViewsManagement.goto();
        await expect(rollupDataView.dataViewRow(HYBRID.DATA_VIEW_PATTERN)).toContainText('Rollup');
      });

      await test.step('the data view exposes the expected fields', async () => {
        await rollupDataView.openDataView(HYBRID.DATA_VIEW_PATTERN);
        const fields = (await rollupDataView.fieldNames()).slice().sort();
        expect(fields).toStrictEqual(expectedFields);
      });
    });

    test('creates a rollup data view over an alias to the rollup index', async ({
      esClient,
      pageObjects,
    }) => {
      test.setTimeout(120_000);
      const { dataViewsManagement, rollupDataView } = pageObjects;

      // Alias the target index, then build a rollup data view over the alias (not the index).
      await createAlias(esClient, HYBRID.ROLLUP_TARGET_INDEX, HYBRID.ROLLUP_ALIAS);

      await test.step('create the rollup data view over the alias', async () => {
        await dataViewsManagement.openCreateWizard();
        await rollupDataView.fillRollupDataView(HYBRID.ROLLUP_ALIAS, '@timestamp');
      });

      await test.step('the alias data view is tagged Rollup in the list', async () => {
        await dataViewsManagement.goto();
        await expect(rollupDataView.dataViewRow(HYBRID.ROLLUP_ALIAS)).toContainText('Rollup');
      });

      await test.step('the alias data view exposes the expected fields', async () => {
        await rollupDataView.openDataView(HYBRID.ROLLUP_ALIAS);
        const fields = (await rollupDataView.fieldNames()).slice().sort();
        expect(fields).toStrictEqual(expectedFields);
      });
    });
  }
);
