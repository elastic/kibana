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

import expect from '@kbn/expect';
import path from 'path';

export default function ({ getService, getPageObjects }) {
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['common', 'settings', 'header', 'savedObjects']);

  //in 6.4.0 bug the Saved Search conflict would be resolved and get imported but the visualization
  //that referenced the saved search was not imported.( https://github.com/elastic/kibana/issues/22238)

  describe('mgmt saved objects', function describeIndexTests() {
    beforeEach(async function () {
      await esArchiver.load('discover');
      await PageObjects.settings.navigateTo();
    });

    afterEach(async function () {
      await esArchiver.unload('discover');
      await esArchiver.load('empty_kibana');
    });

    it('should import saved objects mgmt', async function () {
      await PageObjects.settings.clickKibanaSavedObjects();
      await PageObjects.savedObjects.importFile(
        path.join(__dirname, 'exports', 'mgmt_import_objects.json')
      );
      await PageObjects.settings.associateIndexPattern(
        '4c3f3c30-ac94-11e8-a651-614b2788174a',
        'logstash-*'
      );
      await PageObjects.savedObjects.clickConfirmChanges();
      await PageObjects.savedObjects.clickImportDone();
      await PageObjects.savedObjects.waitTableIsLoaded();

      //instead of asserting on count- am asserting on the titles- which is more accurate than count.
      const objects = await PageObjects.savedObjects.getRowTitles();
      expect(objects.includes('mysavedsearch')).to.be(true);
      expect(objects.includes('mysavedviz')).to.be(true);
    });
  });
}
