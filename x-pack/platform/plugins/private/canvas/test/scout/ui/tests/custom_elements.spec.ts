/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Migrated from: x-pack/platform/test/functional/apps/canvas/custom_elements.ts
 *
 * Verifies the full lifecycle of a Canvas custom element (saved element):
 *   1. Create a custom element from an existing workpad element.
 *   2. Add the custom element back to the workpad.
 *   3. Edit the custom element name/description.
 *   4. Delete the custom element.
 *
 * The four FTR `it` blocks share browser state (each step builds on the previous),
 * so they are merged into a single `test()` using `test.step` — following the
 * Scout best practice for multi-step user journeys.
 *
 * Auth: canvas:all is required (editing a workpad, managing custom elements).
 *
 * Note: `.canvasElementCard__wrapper` and `.euiCard__title` are CSS class selectors
 * on the saved-elements card — brittle but unavoidable until the element cards
 * get `data-test-subj` attributes. The edit/delete icon buttons already have
 * `canvasElementCard__editButton` and `canvasElementCard__deleteButton` testSubj.
 *
 * TODO: add `data-test-subj` to the element card wrapper and title in Canvas source.
 */

import { expect } from '@kbn/scout/ui';
import { test, testData } from '../fixtures';

const NEW_ELEMENT_NAME = 'My New Element';
const NEW_ELEMENT_DESC = 'An excellent new element';
const EDITED_ELEMENT_NAME = 'My Edited New Element';
const EDITED_ELEMENT_DESC = 'An excellent edited element';

test.describe('Canvas custom elements', { tag: ['@local-stateful-classic'] }, () => {
  test.beforeAll(async ({ kbnClient, esArchiver }) => {
    await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.LOGSTASH);
    await kbnClient.importExport.load(testData.KBN_ARCHIVES.DEFAULT);
  });

  test.beforeEach(async ({ browserAuth, pageObjects: { canvas } }) => {
    await browserAuth.loginWithCustomRole(testData.CANVAS_EDITOR_ROLE);
    await canvas.gotoWorkpad(testData.TEST_WORKPAD_ID);
    await expect(canvas.workpadPage).toBeVisible();
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('create → add → edit → delete a custom element', async ({
    page,
    pageObjects: { canvas },
  }) => {
    // ── Step 1: Create a custom element from the markdown element ───────────
    await test.step('create custom element from the first workpad element', async () => {
      // eslint-disable-next-line playwright/no-nth-methods
      await canvas.workpadPageElements.first().click();

      await page.testSubj.locator('canvasWorkpadEditMenuButton').click();
      await page.testSubj.locator('canvasWorkpadEditMenu__saveElementButton').click();

      await canvas.fillOutCustomElementForm(NEW_ELEMENT_NAME, NEW_ELEMENT_DESC);

      await expect(canvas.customElementCreateSuccessToast).toBeVisible();
    });

    // ── Step 2: Add the custom element to the workpad ───────────────────────
    await test.step('add the custom element to the workpad', async () => {
      await canvas.openSavedElementsModal();

      // eslint-disable-next-line playwright/no-nth-methods
      const card = canvas.elementCards.first();
      const cardTitle = card.locator('.euiCard__title');
      await expect(cardTitle).toContainText(NEW_ELEMENT_NAME);
      await card.click();

      // Workpad should now have 5 elements (original 4 + the new one)
      await expect(canvas.workpadPageElements).toHaveCount(5);

      // The new element (5th) should contain the markdown "Welcome to Canvas"
      // eslint-disable-next-line playwright/no-nth-methods
      const newElem = canvas.workpadPageElements.nth(4);
      await expect(newElem.locator('.canvasMarkdown')).toContainText('Welcome to Canvas');

      // Delete the element off the workpad (press Delete key)
      await newElem.click();
      await page.keyboard.press('Delete');
      await expect(canvas.workpadPageElements).toHaveCount(4);
    });

    // ── Step 3: Edit the custom element ────────────────────────────────────
    await test.step('edit the custom element name and description', async () => {
      await canvas.openSavedElementsModal();

      await expect(canvas.elementCards).toHaveCount(1);
      // eslint-disable-next-line playwright/no-nth-methods
      const card = canvas.elementCards.first();
      await card.hover();

      await page.testSubj.locator('canvasElementCard__editButton').click();
      await canvas.fillOutCustomElementForm(EDITED_ELEMENT_NAME, EDITED_ELEMENT_DESC);

      // eslint-disable-next-line playwright/no-nth-methods
      await expect(canvas.elementCards.first().locator('.euiCard__title')).toContainText(
        EDITED_ELEMENT_NAME,
        { timeout: 10_000 }
      );

      await canvas.closeSavedElementsModal();
    });

    // ── Step 4: Delete the custom element ──────────────────────────────────
    await test.step('delete the custom element', async () => {
      await canvas.openSavedElementsModal();

      await expect(canvas.elementCards).toHaveCount(1);
      // eslint-disable-next-line playwright/no-nth-methods
      const card = canvas.elementCards.first();
      await card.hover();

      await page.testSubj.locator('canvasElementCard__deleteButton').click();
      await page.testSubj.locator('confirmModalConfirmButton').click();

      await expect(canvas.elementCards).toHaveCount(0);

      await canvas.closeSavedElementsModal();
    });
  });
});
