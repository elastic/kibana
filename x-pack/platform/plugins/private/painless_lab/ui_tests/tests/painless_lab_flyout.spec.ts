/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, test, tags } from '@kbn/scout';

const TEST_SCRIPT_RESULT = '45';
const TEST_SCRIPT = `
int total = 0;

for (int i = 0; i < 10; ++i) {
  total += i;
}

return total;
`.trim();

test.describe('test scenario', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  test.beforeEach(async ({ browserAuth, pageObject }) => {
    await browserAuth.loginAsAdmin();
    await pageObject.painlessLab.goto();
    await pageObject.painlessLab.waitForRenderComplete();
  });

  test('validate painless lab editor', async ({ pageObject }) => {
    pageObject.painlessLab.setCodeEditorValue(TEST_SCRIPT);
    await expect(pageObject.painlessLab.getCodeEditorValue()).toContainText(TEST_SCRIPT_RESULT);
  });
});
