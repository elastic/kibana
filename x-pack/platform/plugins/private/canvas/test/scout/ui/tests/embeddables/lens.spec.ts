/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Migrated from: x-pack/platform/test/functional/apps/canvas/embeddables/lens.ts
 *
 * Each FTR `describe` shared workpad state across `it` blocks; following Scout best practices
 * (and the migration plan §12.2) they are split into independent `test()` blocks, each setting
 * up its own workpad:
 *   1. By-value: build a new Lens XY panel via the Canvas editor menu and render it on the workpad.
 *   2. By-reference: add an existing Lens visualization from the library and render its metric.
 *   3. Page switch: a workpad whose element renders via a `savedLens` expression keeps rendering
 *      after navigating pages.
 *
 * The FTR edit flows ("edits lens by-value/by-reference") are de-scoped: the by-value creation
 * test already exercises the editor → save-and-return path, and renaming a panel to "v2"
 * exercises the Lens save-as flow rather than the Canvas integration.
 *
 * The FTR `uiSettings.replace({ defaultIndex })` (which wipes ALL settings) is replaced with a
 * non-destructive `update`, reverted in `afterAll` (plan §12.1).
 *
 * Data: a Scout-only copy of the FTR `canvas/lens` + `canvas/logstash_lens` archives whose
 * index is named `canvas_lens` (not `logstash-lens`). The original index maps `bytes` as
 * `float`, which collides with `logstash_functional`'s `long` mapping under the `logstash*`
 * wildcard that Canvas `essql` panels query. Renaming the index keeps the data Scout ingests
 * harmless to other specs, so no index cleanup is required (Scout only ingests, never deletes).
 *
 * Auth: canvas:all + visualize/dashboard access (CANVAS_FULL_EDITOR_ROLE) + logstash* read.
 */

import { expect } from '@kbn/scout/ui';
import { test, testData } from '../../fixtures';

const { LENS } = testData.EMBEDDABLES;
const { label: METRIC_LABEL, value: METRIC_VALUE } = testData.LENS_METRIC;
const EXTENDED_TIMEOUT = 20_000;

test.describe('Canvas lens embeddable', { tag: ['@local-stateful-classic'] }, () => {
  test.beforeAll(async ({ kbnClient, esArchiver }) => {
    await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.CANVAS_LENS);
    await kbnClient.importExport.load(testData.KBN_ARCHIVES.LENS);
    await kbnClient.uiSettings.update({ defaultIndex: 'canvas_lens' });
  });

  test.beforeEach(async ({ browserAuth, pageObjects: { canvas }, page }) => {
    await browserAuth.loginWithCustomRole(testData.CANVAS_FULL_EDITOR_ROLE);
    await page.addInitScript(() => {
      window.localStorage.setItem('data.noDataPopover', 'true');
    });
    await canvas.gotoListing();
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.uiSettings.unset('defaultIndex');
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('creates a by-value Lens XY panel via the editor menu', async ({
    page,
    pageObjects: { canvas, lens, datePicker },
  }) => {
    await canvas.createNewWorkpad();
    await expect(canvas.workpadPage).toBeVisible();

    await canvas.addNewLensPanel();
    // Without a data-containing range, Lens shows a "no data" popover that blocks the
    // dimension editor; set the logstash range first (mirrors FTR `lens.goToTimeRange`).
    await datePicker.setAbsoluteRange(testData.LOGSTASH_TIME_RANGE);
    await lens.configureDimension({
      dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
      operation: 'date_histogram',
      field: '@timestamp',
    });
    await lens.configureDimension({
      dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
      operation: 'average',
      field: 'bytes',
    });
    await canvas.saveLensAndReturn();

    await expect(page.testSubj.locator('xyVisChart')).toBeVisible({ timeout: EXTENDED_TIMEOUT });
  });

  test('adds a by-reference Lens visualization from the library and renders it', async ({
    page,
    pageObjects: { canvas },
  }) => {
    await canvas.createNewWorkpad();
    await expect(canvas.workpadPage).toBeVisible();

    await canvas.addEmbeddableFromLibrary(LENS.libraryName, 'lens');
    await expect(canvas.embeddablePanelHeading(LENS.headingId)).toBeVisible({
      timeout: EXTENDED_TIMEOUT,
    });
    // Only assert the label: the aggregated value depends on the global time range (this viz
    // has none of its own), and the savedLens test below covers value rendering.
    await expect(page.testSubj.locator('metric_label')).toHaveText(METRIC_LABEL, {
      timeout: EXTENDED_TIMEOUT,
    });
  });

  test('keeps rendering a savedLens element after switching workpad pages', async ({
    page,
    pageObjects: { canvas },
  }) => {
    await canvas.openWorkpadByName(testData.TEST_WORKPAD_NAME);
    await expect(canvas.workpadPage).toBeVisible();
    await expect(page.testSubj.locator('metric_value')).toHaveText(METRIC_VALUE, {
      timeout: EXTENDED_TIMEOUT,
    });

    await canvas.addNewPage();
    await canvas.goToPreviousPage();

    await expect(page.testSubj.locator('metric_value')).toHaveText(METRIC_VALUE, {
      timeout: EXTENDED_TIMEOUT,
    });
  });
});
