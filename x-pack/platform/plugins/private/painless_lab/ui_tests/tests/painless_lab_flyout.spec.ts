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

const TEST_SCRIPT_REQUEST = `POST _scripts/painless/_execute\n{\n  \"script\": {\n    \"source\": \"\"\"int total = 0;\n    \n    for (int i = 0; i < 10; ++i) {\n      total += i;\n    }\n    \n    return total;\"\"\",\n    \"params\": {\n      \"string_parameter\": \"string value\",\n      \"number_parameter\": 1.5,\n      \"boolean_parameter\": true\n    }\n  }\n}`;

test.describe('test scenario', { tag: tags.ESS_ONLY }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.painlessLab.goto();
    await pageObjects.painlessLab.waitForRenderComplete();
  });

  test('validate painless lab editor', async ({ pageObjects }) => {
    pageObjects.painlessLab.setCodeEditorValue(TEST_SCRIPT);
    await expect(pageObjects.painlessLab.outputValueElement).toContainText(TEST_SCRIPT_RESULT);

    // pageObjects.painlessLab.setCodeEditorValue(UPDATED_TEST_SCRIPT);
    pageObjects.painlessLab.clickShowApiRequest();
    await expect(pageObjects.painlessLab.requestFlyoutHeader).toBeVisible();

    // const txt = await pageObjects.painlessLab.getFlyoutRequestBody();
    // console.log(txt);

    await expect(await pageObjects.painlessLab.getFlyoutRequestBody()).toBe(TEST_SCRIPT_REQUEST);

    await expect(await pageObjects.painlessLab.getFlyoutResponseBody()).toBe(UPDATED_TEST_SCRIPT_RESPONSE);
  });
});
