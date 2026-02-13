/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { test } from '../../../fixtures';
import { generateLogsData } from '../../../fixtures/generators';

const CLASSIC_STREAM_NAME = 'logs-classic-field-type-test';

// Field type keys and their display labels (from FIELD_TYPE_MAP in constants.ts)
// This mapping is used to verify options are sorted alphabetically by label
const FIELD_TYPE_LABELS: Record<string, string> = {
  boolean: 'Boolean',
  date: 'Date',
  keyword: 'Keyword',
  match_only_text: 'Text (match_only_text)',
  long: 'Number (long)',
  double: 'Number (double)',
  ip: 'IP',
  geo_point: 'Geo point',
  integer: 'Number (integer)',
  short: 'Number (short)',
  byte: 'Number (byte)',
  float: 'Number (float)',
  half_float: 'Number (half_float)',
  text: 'Text',
  wildcard: 'Wildcard',
  version: 'Version',
  unsigned_long: 'Number (unsigned_long)',
  date_nanos: 'Date (nanoseconds)',
  // system is readonly and excluded
};

test.describe(
  'Stream data mapping - field type selector',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ logsSynthtraceEsClient }) => {
      // Create a classic stream for testing
      await generateLogsData(logsSynthtraceEsClient)({ index: CLASSIC_STREAM_NAME });
    });

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.streams.gotoSchemaEditorTab(CLASSIC_STREAM_NAME);
      await pageObjects.streams.verifyClassicBadge();
      await pageObjects.streams.expectSchemaEditorTableVisible();
    });

    test.afterAll(async ({ logsSynthtraceEsClient }) => {
      await logsSynthtraceEsClient.clean();
    });

    test('field type options are sorted alphabetically by display label', async ({
      page,
      pageObjects,
    }) => {
      // Open the add field flyout
      await page.getByTestId('streamsAppContentAddFieldButton').click();
      await expect(
        page.getByTestId('streamsAppSchemaEditorAddFieldFlyoutCloseButton')
      ).toBeVisible();

      // Enter a field name to enable the type selector
      const fieldName = 'test_field';
      await pageObjects.streams.typeFieldName(fieldName);

      // Get all field type option values from the dropdown (in display order)
      const optionValues = await pageObjects.streams.getFieldTypeOptionValues();

      // Verify we have options
      expect(optionValues.length).toBeGreaterThan(0);

      // Convert option values to their display labels
      const displayLabels = optionValues.map((value) => FIELD_TYPE_LABELS[value] || value);

      // Verify the labels are in alphabetical order
      const sortedLabels = [...displayLabels].sort((a, b) => a.localeCompare(b));
      expect(displayLabels).toStrictEqual(sortedLabels);
    });
  }
);
