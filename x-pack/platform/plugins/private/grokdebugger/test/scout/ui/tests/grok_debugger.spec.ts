/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import {
  BUILT_IN_PATTERN_TEST_DATA,
  CUSTOM_PATTERN_TEST_DATA,
  GROK_DEBUGGER_TAGS,
  GROK_DEBUGGER_USER_ROLE,
} from '../fixtures/constants';

const A11Y_SELECTORS = ['.kbnAppWrapper'];

test.describe('Grok Debugger', { tag: GROK_DEBUGGER_TAGS }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginWithCustomRole(GROK_DEBUGGER_USER_ROLE);
    await pageObjects.grokDebugger.goto();
  });

  test('loads the app', async ({ pageObjects }) => {
    await expect(pageObjects.grokDebugger.simulateButton).toBeVisible();
  });

  test('simulates a built-in grok pattern', async ({ page, pageObjects }) => {
    const { grokDebugger } = pageObjects;

    const expectNoA11yViolations = async () => {
      const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
      expect(violations).toStrictEqual([]);
    };

    await test.step('set the event input', async () => {
      await grokDebugger.setEventInput(BUILT_IN_PATTERN_TEST_DATA.event);
      await expectNoA11yViolations();
    });

    await test.step('set the pattern', async () => {
      await grokDebugger.setPatternInput(BUILT_IN_PATTERN_TEST_DATA.pattern);
      await expectNoA11yViolations();
    });

    await test.step('simulate and show the structured event', async () => {
      const output = await grokDebugger.simulate();

      expect(output).toStrictEqual(BUILT_IN_PATTERN_TEST_DATA.structuredEvent);
      await expectNoA11yViolations();
    });
  });

  test('simulates a custom grok pattern', async ({ pageObjects }) => {
    const output = await pageObjects.grokDebugger.executeSimulation(
      CUSTOM_PATTERN_TEST_DATA.event,
      CUSTOM_PATTERN_TEST_DATA.pattern,
      CUSTOM_PATTERN_TEST_DATA.customPattern
    );

    expect(output).toStrictEqual(CUSTOM_PATTERN_TEST_DATA.structuredEvent);
  });
});
