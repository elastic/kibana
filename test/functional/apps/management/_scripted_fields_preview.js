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
  const browser = getService('browser');
  const PageObjects = getPageObjects(['settings']);
  const SCRIPTED_FIELD_NAME = 'myScriptedField';

  describe('scripted fields preview', () => {
    before(async function () {
      await browser.setWindowSize(1200, 800);
      // delete .kibana index and then wait for Kibana to re-create it
      await kibanaServer.uiSettings.replace({ 'dateFormat:tz': 'UTC' });
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndexPatterns();
      await PageObjects.settings.createIndexPattern();
      await kibanaServer.uiSettings.update({ 'dateFormat:tz': 'UTC' });

      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndexPatterns();
      await PageObjects.settings.clickScriptedFieldsTab();
      await PageObjects.settings.clickAddScriptedField();
      await PageObjects.settings.setScriptedFieldName(SCRIPTED_FIELD_NAME);
    });

    after(async function afterAll() {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndexPatterns();
      await PageObjects.settings.removeIndexPattern();
    });

    it('should display script error when script is invalid', async function () {
      const scriptResults = await PageObjects.settings.executeScriptedField(`doc['iHaveNoClosingTick].value`);
      expect(scriptResults.includes('search_phase_execution_exception')).to.be(true);
    });

    it('should display script results when script is valid', async function () {
      const scriptResults = await PageObjects.settings.executeScriptedField(`doc['bytes'].value * 2`);
      expect(scriptResults.replace(/\s/g, '').includes('"myScriptedField":[6196')).to.be(true);
    });

    it('should display additional fields', async function () {
      const scriptResults = await PageObjects.settings.executeScriptedField(`doc['bytes'].value * 2`, ['bytes']);
      expect(scriptResults.replace(/\s/g, '').includes('"bytes":3098')).to.be(true);
    });
  });
}
