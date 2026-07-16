/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Migrated from: x-pack/platform/test/functional/apps/canvas/reports.ts
 *
 * UI smoke for the Canvas PDF report share wiring (no PDF bytes are generated): the workpad
 * header "Share" menu exposes a "PDF reports" item that opens a panel with a "Generate" button.
 * End-to-end PDF generation (status/content-type/disposition) is covered by the reporting API
 * test, which is gated on reporting + Chromium infra being available to Scout's stateful servers.
 */

import { expect } from '@kbn/scout/ui';
import { test, testData } from '../fixtures';

test.describe('Canvas reports share menu', { tag: ['@local-stateful-classic'] }, () => {
  test.beforeAll(async ({ kbnClient }) => {
    await kbnClient.importExport.load(testData.KBN_ARCHIVES.REPORTS);
  });

  test.beforeEach(async ({ browserAuth, pageObjects: { canvas } }) => {
    await browserAuth.loginWithCustomRole(testData.CANVAS_REPORT_ROLE);
    await canvas.gotoWorkpad(testData.REPORTS_WORKPAD_ID);
    await expect(canvas.workpadPage).toBeVisible();
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.importExport.unload(testData.KBN_ARCHIVES.REPORTS);
  });

  test('exposes a PDF reports item with a Generate button', async ({ pageObjects: { canvas } }) => {
    await canvas.openShareMenu();
    await expect(canvas.pdfReportsShareItem).toBeVisible();

    await canvas.openPdfReportsPanel();
    await expect(canvas.generateReportButton).toBeVisible();
  });
});
