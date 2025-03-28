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

test.describe('test scenario', { tag: tags.ESS_ONLY }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.painlessLab.goto();
    await pageObjects.painlessLab.waitForRenderComplete();
  });

  test('validate painless lab editor', async ({ pageObjects }) => {
    pageObjects.painlessLab.setCodeEditorValue(TEST_SCRIPT);
    await expect(pageObjects.painlessLab.outputValueElement).toContainText(TEST_SCRIPT_RESULT);
  });
});
