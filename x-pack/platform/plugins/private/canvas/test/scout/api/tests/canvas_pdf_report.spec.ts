/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Migrated from: x-pack/platform/test/functional/apps/canvas/reports.ts
 *
 * Covers the Canvas reporting contract that Canvas owns: the workpad share menu builds
 * `printablePdfV2` jobParams (see public/components/workpad_header/share_menu/utils.ts) and
 * posts them to the reporting `generate` endpoint, which is gated by the `generate_report`
 * sub-feature privilege. We assert that a privileged user's request is accepted and enqueues a
 * job, and that a user without `generate_report` is denied.
 *
 * Coverage intentionally NOT transferred from the FTR test:
 *   - Asserting the produced PDF's HTTP response (status 200, `content-type: application/pdf`,
 *     `content-disposition` filename) and the job reaching `status: 'completed'`.
 * That path drives the reporting/screenshotting stack (Chromium render -> screenshot -> PDF
 * worker), which does not complete reliably under the Scout server runtime (the PDF worker fails
 * transferring the buffer back from its worker thread). PDF byte generation belongs to the
 * reporting/screenshotting plugins and is covered by their own tests, not Canvas's. The
 * share-menu UI wiring is covered by the UI smoke (reports_share_menu.spec).
 */

import rison from '@kbn/rison';
import { CANVAS_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import { apiTest, testData } from '../fixtures';

const GENERATE_PATH = '/api/reporting/generate/printablePdfV2';

apiTest.describe('Canvas PDF report generation', { tag: ['@local-stateful-classic'] }, () => {
  let reportCredentials: RoleApiCredentials;
  let readOnlyCredentials: RoleApiCredentials;
  // rison-encoded jobParams that mirror Canvas's `getPdfJobParams` for the reports workpad.
  let jobParams: string;

  apiTest.beforeAll(async ({ kbnClient, requestAuth }) => {
    await kbnClient.importExport.load(testData.KBN_ARCHIVES.REPORTS);
    reportCredentials = await requestAuth.getApiKeyForCustomRole(testData.CANVAS_REPORT_ROLE);
    readOnlyCredentials = await requestAuth.getApiKeyForCustomRole(testData.CANVAS_READ_ROLE);

    // The Canvas share menu stamps each locator with the running Kibana version so reporting can
    // migrate the locator state; mirror that here.
    const { version } = await kbnClient.status.get();
    const kibanaVersion = version.number;

    const workpad = await kbnClient.savedObjects.get<{
      width: number;
      height: number;
      pages: unknown[];
    }>({ type: 'canvas-workpad', id: testData.REPORTS_WORKPAD_ID });
    const { width, height, pages } = workpad.attributes;

    const locatorParams = pages.map((_, index) => ({
      id: CANVAS_APP_LOCATOR,
      version: kibanaVersion,
      params: { view: 'workpadPDF', id: testData.REPORTS_WORKPAD_ID, page: index + 1 },
    }));

    jobParams = rison.encode({
      layout: { dimensions: { width, height }, id: 'canvas' },
      objectType: 'canvas workpad',
      locatorParams,
      title: testData.REPORTS_WORKPAD_NAME,
      version: kibanaVersion,
    });
  });

  apiTest.afterAll(async ({ kbnClient, esClient }) => {
    await kbnClient.importExport.unload(testData.KBN_ARCHIVES.REPORTS);
    // Remove jobs enqueued by the accepted-request test so they don't leak into other runs.
    await esClient.deleteByQuery({
      index: '.reporting-*',
      refresh: true,
      conflicts: 'proceed',
      query: { match_all: {} },
    });
  });

  apiTest('accepts Canvas jobParams and enqueues a report job', async ({ apiClient }) => {
    const response = await apiClient.post(GENERATE_PATH, {
      headers: { ...testData.COMMON_HEADERS, ...reportCredentials.apiKeyHeader },
      body: { jobParams },
    });

    expect(response).toHaveStatusCode(200);
    expect(typeof response.body?.path).toBe('string');
    expect(response.body?.path).toContain('/api/reporting/jobs/download/');
    expect(typeof response.body?.job?.id).toBe('string');
    expect(response.body?.job).toMatchObject({ jobtype: 'printable_pdf_v2' });
  });

  apiTest(
    'denies report generation without the generate_report privilege',
    async ({ apiClient }) => {
      const response = await apiClient.post(GENERATE_PATH, {
        headers: { ...testData.COMMON_HEADERS, ...readOnlyCredentials.apiKeyHeader },
        body: { jobParams },
      });

      expect(response).toHaveStatusCode(403);
    }
  );
});
