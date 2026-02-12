/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../../../fixtures';

const STREAM_NAME = 'logs';
const SYSTEM_NAME = 'streams-system-validity-test';

test.describe('Stream systems - condition editor validity', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeAll(async ({ kbnClient }) => {
    // Systems APIs are gated behind this UI setting in the test environment.
    await kbnClient.request({
      path: '/api/kibana/settings',
      method: 'POST',
      body: {
        changes: {
          'observability:streamsEnableSignificantEvents': true,
        },
      },
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

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
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
  });

  test('disables saving when syntax editor JSON is invalid', async ({ page, pageObjects }) => {
    const row = page.locator('tr').filter({ hasText: SYSTEM_NAME });

    // In responsive mode, EUI collapses row actions into an "All actions" menu.
    await row.getByRole('button', { name: /all actions/i }).click();
    await page.getByTestId('system_identification_existing_start_edit_button').click();

    await page.getByTestId('system_identification_existing_save_filter_button').click();
    await pageObjects.streams.toggleConditionEditorWithSyntaxSwitch();

    await pageObjects.streams.fillConditionEditorWithSyntax(
      '{"field":"service.name","eq":"updated"}'
    );
    await expect(
      page.getByTestId('system_identification_existing_save_changes_button')
    ).toBeEnabled();

    await pageObjects.streams.fillConditionEditorWithSyntax('{');
    await expect(
      page.getByTestId('system_identification_existing_save_changes_button')
    ).toBeDisabled();

    await pageObjects.streams.fillConditionEditorWithSyntax(
      '{"field":"service.name","eq":"updated-again"}'
    );
    await expect(
      page.getByTestId('system_identification_existing_save_changes_button')
    ).toBeEnabled();
  });
});
