/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';

import { test } from '../fixtures';
import { CONNECTORS_API, CONNECTORS_WITH_ONE, FLEET_PACKAGES_API } from '../fixtures/mock_data';

const EDIT_INTEGRATION_ID = 'a11y-edit-integration';
const EDIT_DATA_STREAM_ID = 'a11y-data-stream';

const MOCK_INTEGRATION_RESPONSE = {
  integrationResponse: {
    integrationId: EDIT_INTEGRATION_ID,
    title: 'A11y Test Integration',
    description: 'Integration for accessibility tests',
    connectorId: 'test-bedrock-connector',
    dataStreams: [
      {
        dataStreamId: EDIT_DATA_STREAM_ID,
        title: 'Primary logs',
        description: 'Primary log stream',
        inputTypes: [{ name: 'filestream' }],
        status: 'completed',
      },
    ],
    status: 'completed',
  },
};

const MOCK_DATA_STREAM_RESULTS = {
  ingest_pipeline: {
    processors: [{ rename: { field: 'message', target_field: 'event.original' } }],
  },
  results: [{ '@timestamp': '2024-01-01T00:00:00.000Z', message: 'sample log line' }],
};

test.describe(
  'Automatic Import — accessibility — edit pipeline flyout',
  { tag: tags.stateful.classic },
  () => {
    test.beforeEach(async ({ page, browserAuth, pageObjects }) => {
      await page.route(CONNECTORS_API, (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(CONNECTORS_WITH_ONE),
        })
      );

      await page.route(FLEET_PACKAGES_API, (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [] }),
        })
      );

      await page.route('**/api/automatic_import/integrations**', async (route) => {
        const url = route.request().url();
        const method = route.request().method();

        if (
          method === 'GET' &&
          url.includes(`/integrations/${EDIT_INTEGRATION_ID}/data_streams/`)
        ) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_DATA_STREAM_RESULTS),
          });
          return;
        }

        if (method === 'GET' && url.includes(`/integrations/${EDIT_INTEGRATION_ID}`)) {
          const pathAfterIntegrations = url.split('/integrations/')[1]?.split('?')[0] ?? '';
          if (pathAfterIntegrations === EDIT_INTEGRATION_ID) {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify(MOCK_INTEGRATION_RESPONSE),
            });
            return;
          }
        }

        if (method === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([]),
          });
          return;
        }

        await route.continue();
      });

      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.integrationManagement.navigateToEdit(EDIT_INTEGRATION_ID);

      await expect(pageObjects.integrationManagement.getIntegrationTitleInput()).toBeVisible();

      await page.testSubj.click('expandDataStreamButton');

      await expect(page.testSubj.locator('editPipelineFlyout')).toBeVisible();
    });

    test('has no detectable a11y violations on table tab', async ({ page }) => {
      const { violations } = await page.checkA11y({
        include: ['[data-test-subj="editPipelineFlyout"]'],
      });
      expect(violations).toStrictEqual([]);
    });

    test('has no detectable a11y violations on ingest pipeline tab', async ({ page }) => {
      await page.getByRole('tab', { name: 'Ingest pipeline' }).click();
      const { violations } = await page.checkA11y({
        include: ['[data-test-subj="editPipelineFlyout"]'],
      });
      expect(violations).toStrictEqual([]);
    });
  }
);
