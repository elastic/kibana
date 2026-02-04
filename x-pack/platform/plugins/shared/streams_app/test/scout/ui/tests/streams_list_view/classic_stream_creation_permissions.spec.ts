/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../../fixtures';

// Custom role that has Kibana manage_stream privilege but lacks ES manage_index_templates
const STREAMS_MANAGER_WITHOUT_ES_TEMPLATES: KibanaRole = {
  elasticsearch: {
    cluster: ['monitor'], // Basic cluster privilege, but NOT manage_index_templates
    indices: [
      {
        names: ['*'],
        privileges: ['read', 'write', 'manage', 'view_index_metadata'],
      },
    ],
  },
  kibana: [
    {
      base: [],
      feature: {
        streams: ['all'], // Kibana manage_stream privilege
        discover: ['all'],
      },
      spaces: ['*'],
    },
  ],
};

test.describe(
  'Streams list view - classic stream creation permissions',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    test('should disable Create classic stream button when user lacks ES manage_index_templates privilege', async ({
      browserAuth,
      page,
      pageObjects,
    }) => {
      // Login with custom role that has Kibana manage privilege but lacks ES manage_index_templates
      await browserAuth.loginWithCustomRole(STREAMS_MANAGER_WITHOUT_ES_TEMPLATES);
      await pageObjects.streams.gotoStreamMainPage();

      // Find the Create classic stream button
      const createButton = page.getByTestId('streamsCreateClassicStreamButton');
      await expect(createButton).toBeVisible();

      // Button should be disabled due to missing ES privilege
      await expect(createButton).toBeDisabled();

      // Hover over the button to show the tooltip
      await createButton.hover({ force: true });

      // Verify tooltip message about missing Elasticsearch privilege is shown
      await expect(
        page.getByText(
          'You need the Elasticsearch manage_index_templates privilege to create classic streams.'
        )
      ).toBeVisible();
    });

    test('should disable Create classic stream button when user lacks Kibana manage privilege', async ({
      browserAuth,
      page,
      pageObjects,
    }) => {
      // Login as viewer who lacks Kibana manage_stream privilege
      await browserAuth.loginAsViewer();
      await pageObjects.streams.gotoStreamMainPage();

      // Find the Create classic stream button
      const createButton = page.getByTestId('streamsCreateClassicStreamButton');
      await expect(createButton).toBeVisible();

      // Button should be disabled due to missing Kibana privilege
      await expect(createButton).toBeDisabled();

      // Hover over the button to show the tooltip
      await createButton.hover({ force: true });

      // Verify tooltip message about missing Kibana privilege is shown
      await expect(
        page.getByText('You need the Kibana manage streams privilege to create classic streams.')
      ).toBeVisible();
    });

    test('should enable Create classic stream button when user has all required privileges', async ({
      browserAuth,
      page,
      pageObjects,
    }) => {
      // Login as admin who has all privileges
      await browserAuth.loginAsAdmin();
      await pageObjects.streams.gotoStreamMainPage();

      // Find the Create classic stream button
      const createButton = page.getByTestId('streamsCreateClassicStreamButton');
      await expect(createButton).toBeVisible();

      // Button should be enabled
      await expect(createButton).toBeEnabled();
    });
  }
);
