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

const space = '  ';
const TEST_SCRIPT_RESULT = '45';
const UPDATED_TEST_SCRIPT_RESPONSE = '"45"';
const TEST_SCRIPT = `
int total = 0;

for (int i = 0; i < 10; ++i) {
  total += i;
}

return total;
`.trim();
const TEST_SCRIPT_REQUEST = `POST _scripts/painless/_execute
{
  "script": {
    "source": """int total = 0;
  ${space}
    for (int i = 0; i < 10; ++i) {
      total += i;
    }
  ${space}
    return total;""",
    "params": {
      "string_parameter": "string value",
      "number_parameter": 1.5,
      "boolean_parameter": true
    }
  }
}`;

test.describe(
  'Painless Lab',
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

    test('runs a script, navigates the panels, and views the request without a11y violations', async ({
      page,
      pageObjects,
    }) => {
      const { painlessLab } = pageObjects;

      const expectNoA11yViolations = async () => {
        const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
        expect(violations).toStrictEqual([]);
      };

      await test.step('initial render', async () => {
        await expectNoA11yViolations();
      });

      await test.step('run a script and show the result', async () => {
        await painlessLab.setCodeEditorValue(TEST_SCRIPT);
        await painlessLab.editorOutputPane.waitFor({ state: 'visible' });
        await expect(painlessLab.editorOutputPane).toContainText(TEST_SCRIPT_RESULT);
        await expectNoA11yViolations();
      });

      await test.step('view the request and response', async () => {
        // Assert the request while the execution context is still the default
        // ('basic') — selecting another context below changes the request body.
        await painlessLab.viewRequestButton.click();
        await expect(painlessLab.requestFlyoutHeader).toBeVisible();
        expect(await painlessLab.getFlyoutRequestBody()).toBe(TEST_SCRIPT_REQUEST);

        await painlessLab.flyoutResponseTab.click();
        expect(await painlessLab.getFlyoutResponseBody()).toBe(UPDATED_TEST_SCRIPT_RESPONSE);

        await page.keyboard.press('Escape');
        await painlessLab.requestFlyoutHeader.waitFor({ state: 'hidden' });
      });

      await test.step('output, parameters, and context tabs are accessible', async () => {
        for (const tab of [
          painlessLab.outputTab,
          painlessLab.parametersTab,
          painlessLab.contextTab,
        ]) {
          await tab.click();
          await expectNoA11yViolations();
        }
      });

      await test.step('execution context dropdown is accessible', async () => {
        await painlessLab.contextTab.click();

        for (const context of EXECUTION_CONTEXTS) {
          await painlessLab.contextDropdown.click();
          await painlessLab.contextOption(context).waitFor({ state: 'visible' });
          await expectNoA11yViolations();

          await painlessLab.contextOption(context).click();
          await painlessLab.contextOption(context).waitFor({ state: 'hidden' });
          await expectNoA11yViolations();
        }
      });
    });
  }
);
