/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS } from '@kbn/management-settings-ids';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../../../fixtures';

const STREAM_NAME = 'logs.otel';
const SYSTEM_NAME = 'streams-system-validity-test';

test.describe(
  'Stream systems - condition editor validity',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ kbnClient }) => {
      await kbnClient.uiSettings.update({
        [OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS]: true,
      });

      await kbnClient.request({
        path: `/internal/streams/${STREAM_NAME}/systems/${SYSTEM_NAME}`,
        method: 'PUT',
        body: {
          type: 'system',
          name: SYSTEM_NAME,
          description: 'System for validity tests',
          filter: { field: 'service.name', eq: 'initial' },
        },
      });
    });

    test.beforeEach(async ({ browserAuth, pageObjects, page }) => {
      // Mock the licensing API to return an enterprise license (required for System Identification)
      await page.route('**/api/licensing/info', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            license: {
              uid: 'enterprise-license-test',
              type: 'enterprise',
              mode: 'enterprise',
              expiryDateInMillis: 4884310543000,
              status: 'active',
            },
            signature: 'enterprise-license-signature',
          }),
        })
      );

      await browserAuth.loginAsAdmin();
      await pageObjects.streams.gotoAdvancedTab(STREAM_NAME);
    });

    test.afterAll(async ({ kbnClient }) => {
      await kbnClient.request({
        path: `/internal/streams/${STREAM_NAME}/systems/_bulk`,
        method: 'POST',
        body: {
          operations: [{ delete: { system: { name: SYSTEM_NAME } } }],
        },
      });

      await kbnClient.uiSettings.update({
        [OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS]: false,
      });
    });

    test('disables saving when syntax editor YAML is invalid', async ({ page, pageObjects }) => {
      // Verify the System Identification section is visible (requires enterprise license)
      await expect(page.getByText('System identification')).toBeVisible();

      const row = page.locator('tr').filter({ hasText: SYSTEM_NAME });

      // In responsive mode, EUI collapses row actions into an "All actions" menu.
      await row.getByRole('button', { name: /all actions/i }).click();
      await page.getByTestId('system_identification_existing_start_edit_button').click();

      await page.getByTestId('system_identification_existing_save_filter_button').click();
      await pageObjects.streams.toggleConditionEditorWithSyntaxSwitch();

      await pageObjects.streams.fillConditionEditorWithSyntax('field: service.name\neq: updated');
      await expect(
        page.getByTestId('system_identification_existing_save_changes_button')
      ).toBeEnabled();

      await pageObjects.streams.fillConditionEditorWithSyntax('field: :\ninvalid');
      await expect(
        page.getByTestId('system_identification_existing_save_changes_button')
      ).toBeDisabled();

      await pageObjects.streams.fillConditionEditorWithSyntax(
        'field: service.name\neq: updated-again'
      );
      await expect(
        page.getByTestId('system_identification_existing_save_changes_button')
      ).toBeEnabled();
    });
  }
);
