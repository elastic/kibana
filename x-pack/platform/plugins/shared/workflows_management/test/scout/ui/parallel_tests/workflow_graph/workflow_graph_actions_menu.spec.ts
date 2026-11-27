/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest as test } from '../../fixtures';

const EXPERIMENTAL_FEATURES_SETTING = 'workflows:experimentalFeatures';
/** The categories hovered: the ones whose steps have icons that are fetched the first time they are drawn. */
const HOVERED_CATEGORIES = 6;
/** More than the time a fetched icon takes to arrive and the modal to show again, locally and in CI. */
const ICON_FETCH_WINDOW_MS = 1500;

interface FlashWindow {
  __menuFlashes: string[];
}

test.describe(
  'Workflow graph — the add-step menu',
  {
    tag: [
      ...tags.stateful.classic,
      ...tags.serverless.observability.complete,
      ...tags.serverless.security.complete,
    ],
  },
  () => {
    test.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.set({ [EXPERIMENTAL_FEATURES_SETTING]: true });
    });

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.workflowEditor.gotoNewWorkflow();
      await pageObjects.workflowEditor.graphCanvas.waitFor({ state: 'visible' });
    });

    test.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset(EXPERIMENTAL_FEATURES_SETTING);
    });

    test('hovering the categories the first time does not hide the modal or play its entry animation again', async ({
      pageObjects,
      page,
    }) => {
      const { workflowGraphAuthoring: authoring } = pageObjects;
      await authoring.addTrigger('Manual', true);
      await authoring.closeTriggerPanel();

      await authoring.openAddStepFromWire({ mode: 'prepend-step' });
      const modal = page.testSubj.locator('actionsMenuModal');
      await modal.waitFor();
      // The modal fades in when it opens; what is looked for starts after that.
      await expect.poll(() => modal.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');

      await page.evaluate(() => {
        const flashes: string[] = [];
        (window as unknown as FlashWindow).__menuFlashes = flashes;
        const menu = document.querySelector('[data-test-subj="actionsMenuModal"]');
        const ancestors = new Set<Element>();
        for (let el = menu; el && el !== document.body; el = el.parentElement) ancestors.add(el);
        // A boundary that suspends hides what it holds with `display: none`.
        new MutationObserver((records) =>
          records.forEach((record) => {
            const style = (record.target as Element).getAttribute('style') ?? '';
            if (ancestors.has(record.target as Element) && style.includes('display: none')) {
              flashes.push(`hidden: ${style}`);
            }
          })
        ).observe(document.body, { attributes: true, attributeFilter: ['style'], subtree: true });
        // Showing it again plays the modal's entry animation again.
        document.addEventListener(
          'animationstart',
          (event) => {
            const { className } = event.target as Element;
            if (/euiModal|euiOverlayMask/.test(String(className))) {
              flashes.push(`animation: ${event.animationName}`);
            }
          },
          true
        );
      });

      const categories = await page.getByRole('option').all();
      for (const category of categories.slice(0, HOVERED_CATEGORIES)) {
        await category.hover();
      }
      // The icons that were not there yet are fetched while the categories are hovered: give them time to arrive.
      await page.evaluate(
        (ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
        ICON_FETCH_WINDOW_MS
      );

      expect(
        await page.evaluate(() => (window as unknown as FlashWindow).__menuFlashes)
      ).toStrictEqual([]);
      await expect(modal).toBeVisible();
    });
  }
);
