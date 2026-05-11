/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, testData } from '../fixtures';

test.describe('Ingest pipelines feature controls', { tag: tags.stateful.classic }, () => {
  const managementLanding = (page: ScoutPage) =>
    page.testSubj
      .locator('cards-navigation-page')
      .or(page.testSubj.locator('managementHome'))
      .or(page.testSubj.locator('managementHomeSolution'));

  test('kibana admin shows Stack Management without the Ingest section', async ({
    browserAuth,
    page,
    pageObjects,
    kbnUrl,
  }) => {
    await browserAuth.loginWithCustomRole({
      elasticsearch: { cluster: [] },
      kibana: [
        {
          base: [],
          feature: {
            advancedSettings: ['all'],
          },
          spaces: ['*'],
        },
      ],
    });
    await page.goto(kbnUrl.app('management'));

    await expect(managementLanding(page)).toBeVisible();

    const navLinks = await pageObjects.collapsibleNav.getNavLinks();
    expect(navLinks).toContain('Stack Management');

    await expect(page.getByRole('link', { name: 'Ingest pipelines' })).toBeHidden();
  });

  test('dashboard read with ingest pipelines privileges shows the Ingest section', async ({
    browserAuth,
    page,
    pageObjects,
    kbnUrl,
  }) => {
    await browserAuth.loginWithCustomRole(
      testData.GLOBAL_DASHBOARD_READ_WITH_INGEST_PIPELINES_ROLE
    );
    await page.goto(kbnUrl.app('management'));

    await expect(managementLanding(page)).toBeVisible();

    const navLinks = await pageObjects.collapsibleNav.getNavLinks();
    expect(navLinks).toContain('Stack Management');

    await expect(page.getByRole('link', { name: 'Ingest pipelines' })).toBeVisible();
  });

  test('ingest user with dev tools has the embedded console', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(testData.GLOBAL_DEVTOOLS_READ_WITH_INGEST_PIPELINES_ROLE);
    await pageObjects.ingestPipelines.goto();

    const controlBar = page.testSubj.locator('consoleEmbeddedControlBar');
    const body = page.testSubj.locator('consoleEmbeddedBody');

    await expect(controlBar).toBeVisible();
    await expect(body).toBeHidden();

    await controlBar.click();
    await expect(body).toBeVisible();

    await controlBar.click();
    await expect(body).toBeHidden();
  });
});
