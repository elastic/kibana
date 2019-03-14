/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */


import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');
  const log = getService('log');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['settings']);

  describe('filter scripted fields', function describeIndexTests() {

    beforeEach(async function () {
      await browser.setWindowSize(1200, 800);
      await kibanaServer.uiSettings.replace({});
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndices();
      await PageObjects.settings.createIndexPattern();
      await kibanaServer.uiSettings.update({});
    });

    const scriptedExpressionFieldName = 'ram_expr1';
    const scriptedPainlessFieldName = 'ram_pain1';

    it('should filter scripted fields', async function () {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndices();
      await PageObjects.settings.clickScriptedFieldsTab();
      const scriptedFieldLangsBefore = await PageObjects.settings.getScriptedFieldLangs();
      await log.debug('add scripted field');
      await PageObjects.settings
        .addScriptedField(scriptedExpressionFieldName,
          'expression', 'number', null, '1', 'doc[\'machine.ram\'].value / (1024 * 1024 * 1024)'
        );
      await PageObjects.settings
        .addScriptedField(scriptedPainlessFieldName,
          'painless', 'number', null, '1', 'doc[\'machine.ram\'].value / (1024 * 1024 * 1024)'
        );

      // confirm two additional scripted fields were created
      await retry.try(async function () {
        const scriptedFieldLangs = await PageObjects.settings.getScriptedFieldLangs();
        expect(scriptedFieldLangs.length).to.be(scriptedFieldLangsBefore.length + 2);
      });

      await PageObjects.settings.setScriptedFieldLanguageFilter('painless');

      await retry.try(async function () {
        const scriptedFieldLangs = await PageObjects.settings.getScriptedFieldLangs();
        expect(scriptedFieldLangs.length).to.be.above(0);
        for (const lang of scriptedFieldLangs) {
          expect(lang).to.be('painless');
        }
      });

      await PageObjects.settings.setScriptedFieldLanguageFilter('expression');

      await retry.try(async function () {
        const scriptedFieldLangs = await PageObjects.settings.getScriptedFieldLangs();
        expect(scriptedFieldLangs.length).to.be.above(0);
        for (const lang of scriptedFieldLangs) {
          expect(lang).to.be('expression');
        }
      });
    });

  });
}
