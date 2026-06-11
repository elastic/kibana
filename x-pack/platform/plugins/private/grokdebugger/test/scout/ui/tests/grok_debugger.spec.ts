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

test.describe('Grok Debugger', { tag: GROK_DEBUGGER_TAGS }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginWithCustomRole(GROK_DEBUGGER_USER_ROLE);
    await pageObjects.grokDebugger.goto();
  });

  test('loads the app', async ({ pageObjects }) => {
    await expect(pageObjects.grokDebugger.simulateButton).toBeVisible();
  });

  test('simulates a built-in grok pattern', async ({ pageObjects }) => {
    const output = await pageObjects.grokDebugger.executeSimulation(
      BUILT_IN_PATTERN_TEST_DATA.event,
      BUILT_IN_PATTERN_TEST_DATA.pattern
    );

    expect(output).toStrictEqual(BUILT_IN_PATTERN_TEST_DATA.structuredEvent);
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
