/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { OBSERVABILITY_STREAMS_ENABLE_CANVAS } from '@kbn/management-settings-ids';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

const TAB_NAMES = ['canvas', 'sources', 'pipelines', 'destinations'];

test.describe(
  'Streams layout',
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
      await streams.gotoStreamsLayout();

      for (const tabName of TAB_NAMES) {
        await expect(streams.getStreamsLayoutTab(tabName)).toBeVisible();
      }

      await expect(streams.getStreamsLayoutTab('canvas')).toHaveAttribute('aria-selected', 'true');
    });

    test('falls back to the canvas tab for an unknown tab', async ({
      pageObjects: { streams },
    }) => {
      await streams.gotoStreamsLayoutTab('does-not-exist');

      await expect(streams.getStreamsLayoutTab('canvas')).toHaveAttribute('aria-selected', 'true');
    });

    test('shows a placeholder for the tabs that have no content yet', async ({
      pageObjects: { streams },
    }) => {
      await streams.gotoStreamsLayout();

      await streams.clickStreamsLayoutTab('sources');
      await expect(streams.streamsLayoutSourcesPlaceholder).toBeVisible();
    });

    test('shows the pipelines tab as disabled with a milestone tooltip', async ({
      page,
      pageObjects: { streams },
    }) => {
      await streams.gotoStreamsLayout();

      const pipelinesTab = streams.getStreamsLayoutTab('pipelines');
      await expect(pipelinesTab).toBeVisible();
      await expect(pipelinesTab).toBeDisabled();

      await pipelinesTab.hover({ force: true });
      await expect(page.getByRole('tooltip', { name: 'Not part of V1 milestone' })).toBeVisible();
    });

    test('renders the destinations table', async ({ pageObjects: { streams } }) => {
      await streams.gotoStreamsLayoutTab('destinations');

      await expect(streams.streamsDestinationsTable).toBeVisible();
      await expect(streams.streamsDestinationsSearch).toBeVisible();
    });

    test('lists canvas destinations and returns to the table from a destination', async ({
      page,
      pageObjects: { streams },
    }) => {
      await streams.gotoStreamsLayoutTab('destinations');

      const destinationLink = page.getByTestId('streamsDestinationsNameLink-logs-archive.cold');
      await expect(destinationLink).toBeVisible();
      await destinationLink.click();

      await expect(page.getByRole('heading', { name: 'logs-archive.cold' })).toBeVisible();

      await page.getByTestId('appHeaderBack').click();
      await expect(streams.streamsDestinationsTable).toBeVisible();
    });
  }
);
