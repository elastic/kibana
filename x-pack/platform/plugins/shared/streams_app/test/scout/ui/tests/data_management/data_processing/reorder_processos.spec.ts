/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable playwright/expect-expect */

import { test } from '../../../fixtures';
import { generateLogsData } from '../../../fixtures/generators';

test.describe(
  'Stream data processing - reordering processors',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    test.beforeAll(async ({ apiServices, logsSynthtraceEsClient }) => {
      await apiServices.streams.enable();
      await generateLogsData(logsSynthtraceEsClient)({ index: 'logs-generic-default' });
    });

    test.beforeEach(async ({ apiServices, browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      // Clear existing processors before each test
      await apiServices.streams.updateStreamProcessors('logs-generic-default', {
        steps: [
          { action: 'grok', from: 'message', patterns: ['%{WORD:attributes.method}'] },
          { action: 'set', to: 'custom_field', value: 'custom_value' },
          { action: 'rename', from: 'custom_field', to: 'renamed_custom_field' },
        ],
      });

      await pageObjects.streams.gotoProcessingTab('logs-generic-default');
    });

    test.afterAll(async ({ apiServices, logsSynthtraceEsClient }) => {
      await logsSynthtraceEsClient.clean();
      await apiServices.streams.disable();
    });

    test('should reorder processors via drag and drop', async ({ pageObjects }) => {
      await pageObjects.streams.expectProcessorsOrder(['GROK', 'SET', 'RENAME']);

      await pageObjects.streams.dragProcessor({ processorPos: 0, steps: 2 });

      await pageObjects.streams.saveProcessorsListChanges();
      await pageObjects.streams.expectToastVisible();

      await pageObjects.streams.expectProcessorsOrder(['SET', 'RENAME', 'GROK']);
    });

    test('should cancel reordering', async ({ pageObjects }) => {
      await pageObjects.streams.expectProcessorsOrder(['GROK', 'SET', 'RENAME']);

      await pageObjects.streams.dragProcessor({ processorPos: 0, steps: 2 });

      await pageObjects.streams.cancelChanges();

      await pageObjects.streams.expectProcessorsOrder(['GROK', 'SET', 'RENAME']);
    });
  }
);
