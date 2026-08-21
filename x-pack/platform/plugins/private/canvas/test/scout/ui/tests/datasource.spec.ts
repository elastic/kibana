/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Migrated from: x-pack/platform/test/functional/apps/canvas/datasource.ts
 *
 * Verifies the Canvas datasource switcher for a datatable element:
 *   1. After adding a datatable element and selecting the "esdocs" datasource,
 *      the data view picker shows the logstash-* data view.
 *   2. After selecting logstash-*, the expression updates to use `esdocs index="logstash-*"`.
 *
 * The two FTR `it` blocks are merged into one `test()` with two `test.step`s
 * because step 2 depends on the datasource selection made in step 1.
 *
 * Auth: canvas:all is required (creating elements, editing datasource).
 */

import { expect } from '@kbn/scout/ui';
import { test, testData } from '../fixtures';

test.describe('Canvas datasource', { tag: ['@local-stateful-classic'] }, () => {
  test.beforeAll(async ({ kbnClient, esArchiver }) => {
    await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.LOGSTASH);
    // Load the logstash-* index pattern (legacy.json) so Canvas's data view picker can list it.
    await kbnClient.importExport.load(testData.KBN_ARCHIVES.LEGACY_DATA_VIEWS);
    // Canvas sets itself inaccessible (AppStatus.inaccessible) when no workpads exist in Kibana,
    // which renders as "Application Not Found". Load the default workpad so the app is accessible.
    await kbnClient.importExport.load(testData.KBN_ARCHIVES.DEFAULT);
  });

  test.beforeEach(async ({ browserAuth, pageObjects: { canvas } }) => {
    await browserAuth.loginWithCustomRole(testData.CANVAS_EDITOR_ROLE);
    await canvas.gotoListing();
    await canvas.createNewWorkpad();
    await expect(canvas.workpadPage).toBeVisible();
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('sidebar shows esdocs settings and expression updates after datasource change', async ({
    page,
    pageObjects: { canvas },
  }) => {
    await test.step('add a new datatable element', async () => {
      await canvas.createNewDatatableElement();
      await page.testSubj.locator('canvasWorkpadPageElementContent').waitFor({ state: 'visible' });
    });

    await test.step('open Data tab and switch to esdocs datasource', async () => {
      await canvas.openDatasourceTab();
      await canvas.changeDatasourceTo('esdocs');
    });

    await test.step(`verify 'logstash-*' is selected and expression updates`, async () => {
      // The value is auto-populated asynchronously after switching to esdocs; poll until it settles.
      await expect
        .poll(() => page.components.comboBox('canvasDataViewSelect').getSelectedOptions())
        .toStrictEqual(['logstash-*']);

      // Confirm the auto-populated value to trigger the datasource onChange.
      await page.testSubj.locator('canvasDataViewSelect > comboBoxSearchInput').press('Enter');
      await canvas.saveDatasourceChanges();
      await canvas.openExpressionEditor();
      await canvas.waitForCodeEditorReady('canvasExpressionInput');

      const expr = await canvas.getCodeEditorValue();
      expect(expr).toContain('esdocs index="logstash-*"');
    });
  });
});
