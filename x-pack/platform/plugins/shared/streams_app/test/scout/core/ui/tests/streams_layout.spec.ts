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

    test('renders Sources and placeholders for tabs without content', async ({
      pageObjects: { streams },
    }) => {
      await streams.gotoStreamsLayout();

      await streams.clickStreamsLayoutTab('sources');
      await expect(streams.streamsSourcesTable).toBeVisible();
      await expect(streams.streamsAddSourceButton).toBeVisible();

      await streams.clickStreamsLayoutTab('pipelines');
      await expect(streams.streamsLayoutPipelinesPlaceholder).toBeVisible();
    });

    test('renders the destinations table', async ({ pageObjects: { streams } }) => {
      await streams.gotoStreamsLayoutTab('destinations');

      await expect(streams.streamsDestinationsTable).toBeVisible();
      await expect(streams.streamsDestinationsSearch).toBeVisible();
    });
  }
);
