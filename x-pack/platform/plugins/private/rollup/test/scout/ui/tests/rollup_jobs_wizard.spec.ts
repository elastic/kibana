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
  seedSourceIndices,
  deleteAllRollupJobs,
  cleanupRollupIndices,
} from '../fixtures';

const { A11Y_SELECTORS, SOURCE_INDEX_PATTERN, TARGET_INDEX_NAME } = testData;

// A rollup job name can never be reused (even after delete), so make it unique per run.
const uniqueJobName = () => `rollup-to-be-${Date.now()}`;

// Local + cloud stateful: rollup does not exist on serverless.
test.describe(
  'Rollup jobs - create wizard',
  { tag: ['@local-stateful-classic', '@cloud-stateful-classic'] },
  () => {
    test.beforeEach(async ({ browserAuth, esClient, pageObjects }) => {
      // Rollup jobs and indices are cluster-global; clear leftovers from a crashed run so the
      // empty-list prompt holds, then unhide the deprecated UI and seed matching source indices.
      await deleteAllRollupJobs(esClient);
      await cleanupRollupIndices(esClient);
      await createMockRollupIndex(esClient);
      await seedSourceIndices(esClient);
      await browserAuth.loginAsAdmin();
      await pageObjects.rollup.goto();
    });

    test.afterEach(async ({ esClient }) => {
      await deleteAllRollupJobs(esClient);
      await cleanupRollupIndices(esClient);
    });

    test('walks the create-job wizard and lists the new job, accessible at each step', async ({
      page,
      pageObjects,
    }) => {
      // Six sequential wizard steps plus job creation exceed Playwright's 30s default.
      test.setTimeout(120_000);
      const { rollup } = pageObjects;
      const jobName = uniqueJobName();

      const expectNoA11yViolations = async () => {
        const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
        expect(violations).toStrictEqual([]);
      };

      await test.step('empty list shows the deprecation prompt', async () => {
        await expect(rollup.deprecationPrompt).toBeVisible();
        await expectNoA11yViolations();
      });

      await test.step('logistics', async () => {
        await rollup.startCreate();
        await expect(rollup.stepActive(1)).toBeVisible();
        await expectNoA11yViolations();
        await rollup.fillLogistics({
          name: jobName,
          indexPattern: SOURCE_INDEX_PATTERN,
          indexName: TARGET_INDEX_NAME,
          cron: '*/10 * * * * ?',
          delay: '1d',
        });
      });

      await test.step('date histogram', async () => {
        await rollup.next();
        await expect(rollup.stepActive(2)).toBeVisible();
        await expectNoA11yViolations();
        await rollup.setInterval('1000ms');
      });

      await test.step('terms', async () => {
        await rollup.next();
        await expect(rollup.stepActive(3)).toBeVisible();
        await expectNoA11yViolations();
      });

      await test.step('histogram', async () => {
        await rollup.next();
        await expect(rollup.stepActive(4)).toBeVisible();
        await expectNoA11yViolations();
      });

      await test.step('metrics', async () => {
        await rollup.next();
        await expect(rollup.stepActive(5)).toBeVisible();
        await expectNoA11yViolations();
      });

      await test.step('review', async () => {
        await rollup.next();
        await expect(rollup.stepActive(6)).toBeVisible();
        await expectNoA11yViolations();
      });

      await test.step('save and view the details flyout', async () => {
        await rollup.save();
        await expect(rollup.detailsFlyoutTitle).toBeVisible();
        await expectNoA11yViolations();
      });

      await test.step('new job appears in the list', async () => {
        await rollup.closeFlyout();
        await expect(rollup.jobRow(jobName)).toBeVisible();
        await expectNoA11yViolations();
      });
    });
  }
);
