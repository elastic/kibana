/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Migrated from: x-pack/platform/test/functional/apps/canvas/embeddables/saved_search.ts
 *
 * Focuses on the Canvas-specific integration points for a saved-search embeddable:
 *   1. Adding an existing (by-reference) saved search from the library renders it on the workpad.
 *   2. The panel "Edit" action routes the saved search into Discover for inline editing.
 *
 * The FTR suite additionally renamed the search to "v2" in Discover and asserted the workpad
 * picked up the new title. That round-trip mostly exercises Discover's save-as flow, so it is
 * trimmed here to keep the spec focused purely on the Canvas integration (add + edit-routing).
 *
 * Auth: canvas:all + discover/dashboard/visualize access (CANVAS_FULL_EDITOR_ROLE).
 */

import { expect } from '@kbn/scout/ui';
import { test, testData } from '../../fixtures';

const { SAVED_SEARCH } = testData.EMBEDDABLES;

test.describe('Canvas saved search embeddable', { tag: testData.CANVAS_UI_TAGS }, () => {
  test.beforeAll(async ({ kbnClient }) => {
    await kbnClient.importExport.load(testData.KBN_ARCHIVES.DASHBOARD);
    // Canvas is only accessible when at least one workpad exists.
    await kbnClient.importExport.load(testData.KBN_ARCHIVES.DEFAULT);
  });

  test.beforeEach(async ({ browserAuth, pageObjects: { canvas } }) => {
    await browserAuth.loginWithCustomRole(testData.CANVAS_FULL_EDITOR_ROLE);
    await canvas.gotoListing();
    await canvas.createNewWorkpad();
    await expect(canvas.workpadPage).toBeVisible();
    await canvas.setWorkpadName('saved search tests');
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('adds a by-reference saved search from the library and renders it', async ({
    pageObjects: { canvas },
  }) => {
    await canvas.addEmbeddableFromLibrary(SAVED_SEARCH.libraryName, 'search');
    await expect(canvas.embeddablePanelHeading(SAVED_SEARCH.headingId)).toBeVisible({
      timeout: 30_000,
    });
  });

  test('routes the saved search into Discover from the panel edit action', async ({
    page,
    pageObjects: { canvas },
  }) => {
    await canvas.addEmbeddableFromLibrary(SAVED_SEARCH.libraryName, 'search');
    await expect(canvas.embeddablePanelHeading(SAVED_SEARCH.headingId)).toBeVisible({
      timeout: 30_000,
    });

    await canvas.editPanel();
    await canvas.clickEditInDiscover();

    await expect(page.testSubj.locator('dscPage')).toBeVisible({ timeout: 30_000 });
  });
});
