/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import type { PainlessContext } from '../fixtures/page_objects/painless_lab_page';
import { test } from '../fixtures';

// EuiSuperSelect options render in an EUI portal outside .kbnAppWrapper.
const A11Y_SELECTORS = ['.kbnAppWrapper', '[data-euiportal="true"]'];

const EXECUTION_CONTEXTS: PainlessContext[] = ['basic', 'filter', 'score'];

test.describe(
  'Painless Lab - accessibility',
  {
    tag: [
      ...tags.stateful.classic,
      ...tags.serverless.security.complete,
      ...tags.serverless.observability.complete,
    ],
  },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.painlessLab.goto();
      await pageObjects.painlessLab.waitForEditorToLoad();
    });

    test('editor and output pane tabs have no a11y violations', async ({ page, pageObjects }) => {
      const { painlessLab } = pageObjects;

      await test.step('initial render', async () => {
        const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
        expect(violations).toStrictEqual([]);
      });

      await test.step('output tab', async () => {
        await painlessLab.outputTab.click();
        const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
        expect(violations).toStrictEqual([]);
      });

      await test.step('parameters tab', async () => {
        await painlessLab.parametersTab.click();
        const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
        expect(violations).toStrictEqual([]);
      });

      await test.step('context tab', async () => {
        await painlessLab.contextTab.click();
        const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
        expect(violations).toStrictEqual([]);
      });
    });

    test('execution context dropdown has no a11y violations', async ({ page, pageObjects }) => {
      const { painlessLab } = pageObjects;

      // The execution context dropdown lives inside the "Context" tab
      await painlessLab.contextTab.click();

      for (const context of EXECUTION_CONTEXTS) {
        await test.step(`dropdown open (before selecting ${context})`, async () => {
          await painlessLab.contextDropdown.click();
          await painlessLab.contextOption(context).waitFor({ state: 'visible' });
          const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
          expect(violations).toStrictEqual([]);
        });

        await test.step(`${context} context selected`, async () => {
          await painlessLab.contextOption(context).click();
          await painlessLab.contextOption(context).waitFor({ state: 'hidden' });
          const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
          expect(violations).toStrictEqual([]);
        });
      }
    });
  }
);
