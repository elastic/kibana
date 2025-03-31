/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, test, tags } from '@kbn/scout';

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

test.describe('Painless Lab', { tag: tags.ESS_ONLY }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.painlessLab.goto();
    await pageObjects.painlessLab.waitForRenderComplete();
  });

  test('validate painless lab editor and request', async ({ pageObjects }) => {
    pageObjects.painlessLab.setCodeEditorValue(TEST_SCRIPT);
    await expect(pageObjects.painlessLab.outputValueElement).toContainText(TEST_SCRIPT_RESULT);

    pageObjects.painlessLab.clickShowApiRequest();
    await expect(pageObjects.painlessLab.requestFlyoutHeader).toBeVisible();

    expect(await pageObjects.painlessLab.getFlyoutRequestBody()).toBe(TEST_SCRIPT_REQUEST);

    expect(await pageObjects.painlessLab.getFlyoutResponseBody()).toBe(
      UPDATED_TEST_SCRIPT_RESPONSE
    );
  });
});
