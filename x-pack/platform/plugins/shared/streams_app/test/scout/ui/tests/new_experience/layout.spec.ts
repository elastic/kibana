/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { OBSERVABILITY_STREAMS_ENABLE_CANVAS } from '@kbn/management-settings-ids';
import { expect } from '@kbn/scout/ui';
import { test } from '../../fixtures';

const TAB_NAMES = ['canvas', 'sources', 'pipelines', 'destinations'];

test.describe(
  'New experience layout',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ kbnClient }) => {
      await kbnClient.uiSettings.update({
        [OBSERVABILITY_STREAMS_ENABLE_CANVAS]: true,
      });
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ kbnClient }) => {
      await kbnClient.uiSettings.update({
        [OBSERVABILITY_STREAMS_ENABLE_CANVAS]: false,
      });
    });

    test('renders every tab and lands on canvas', async ({ pageObjects: { streams } }) => {
      await streams.gotoNewExperience();

      for (const tabName of TAB_NAMES) {
        await expect(streams.getNewExperienceTab(tabName)).toBeVisible();
      }

      await expect(streams.getNewExperienceTab('canvas')).toHaveAttribute('aria-selected', 'true');
    });

    test('falls back to the canvas tab for an unknown tab', async ({
      pageObjects: { streams },
    }) => {
      await streams.gotoNewExperienceTab('does-not-exist');

      await expect(streams.getNewExperienceTab('canvas')).toHaveAttribute('aria-selected', 'true');
    });

    test('shows a placeholder for the tabs that have no content yet', async ({
      pageObjects: { streams },
    }) => {
      await streams.gotoNewExperience();

      await streams.clickNewExperienceTab('sources');
      await expect(streams.newExperienceSourcesPlaceholder).toBeVisible();

      await streams.clickNewExperienceTab('pipelines');
      await expect(streams.newExperiencePipelinesPlaceholder).toBeVisible();

      await streams.clickNewExperienceTab('destinations');
      await expect(streams.newExperienceDestinationsPlaceholder).toBeVisible();
    });
  }
);
