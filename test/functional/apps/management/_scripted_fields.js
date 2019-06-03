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

// Tests for 4 scripted fields;
// 1. Painless (number type)
// 2. Painless (string type)
// 3. Painless (boolean type)
// 4. Painless (date type)
//
// Each of these scripted fields has 4 tests (12 tests total);
// 1. Create scripted field
// 2. See the expected value of the scripted field in Discover doc view
// 3. Filter in Discover by the scripted field
// 4. Visualize with aggregation on the scripted field by clicking discover.clickFieldListItemVisualize

// NOTE: Scripted field input is managed by Ace editor, which automatically
//   appends closing braces, for exmaple, if you type opening square brace [
//   it will automatically insert a a closing square brace ], etc.

import expect from '@kbn/expect';

export default function ({ getService, getPageObjects }) {
  const kibanaServer = getService('kibanaServer');
  const log = getService('log');
  const browser = getService('browser');
  const retry = getService('retry');
  const inspector = getService('inspector');
  const testSubjects = getService('testSubjects');
  const filterBar = getService('filterBar');
  const PageObjects = getPageObjects(['common', 'header', 'settings', 'visualize', 'discover', 'timePicker']);

  describe('scripted fields', function () {
    this.tags(['skipFirefox']);

    before(async function () {
      await browser.setWindowSize(1200, 800);
      // delete .kibana index and then wait for Kibana to re-create it
      await kibanaServer.uiSettings.replace({});
      await PageObjects.settings.createIndexPattern();
      await kibanaServer.uiSettings.update({});
    });

    after(async function afterAll() {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndexPatterns();
      await PageObjects.settings.clickIndexPatternLogstash();
      await PageObjects.settings.removeIndexPattern();
    });

    it('should not allow saving of invalid scripts', async function () {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndexPatterns();
      await PageObjects.settings.clickIndexPatternLogstash();
      await PageObjects.settings.clickScriptedFieldsTab();
      await PageObjects.settings.clickAddScriptedField();
      await PageObjects.settings.setScriptedFieldName('doomedScriptedField');
      await PageObjects.settings.setScriptedFieldScript(`i n v a l i d  s c r i p t`);
      await PageObjects.settings.clickSaveScriptedField();
      await retry.try(async () => {
        const invalidScriptErrorExists = await testSubjects.exists('invalidScriptError');
        expect(invalidScriptErrorExists).to.be(true);
      });
    });


    describe('testing regression for issue #33251', function describeIndexTests() {
      const scriptedPainlessFieldName = 'ram_Pain_reg';

      it('should create and edit scripted field', async function () {
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaIndexPatterns();
        await PageObjects.settings.clickIndexPatternLogstash();
        const startingCount = parseInt(await PageObjects.settings.getScriptedFieldsTabCount());
        await PageObjects.settings.clickScriptedFieldsTab();
        await log.debug('add scripted field');
        const script = `1`;
        await PageObjects.settings.addScriptedField(scriptedPainlessFieldName, 'painless', 'number', null, '1', script);
        await retry.try(async function () {
          expect(parseInt(await PageObjects.settings.getScriptedFieldsTabCount())).to.be(startingCount + 1);
        });

        for (let i = 0; i < 3; i++) {
          await PageObjects.settings.editScriptedField(scriptedPainlessFieldName);
          const fieldSaveButton = await testSubjects.exists('fieldSaveButton');
          expect(fieldSaveButton).to.be(true);
          await PageObjects.settings.clickSaveScriptedField();
        }
      });
    });


    describe('creating and using Painless numeric scripted fields', function describeIndexTests() {
      const scriptedPainlessFieldName = 'ram_Pain1';

      it('should create scripted field', async function () {
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaIndexPatterns();
        await PageObjects.settings.clickIndexPatternLogstash();
        const startingCount = parseInt(await PageObjects.settings.getScriptedFieldsTabCount());
        await PageObjects.settings.clickScriptedFieldsTab();
        await log.debug('add scripted field');
        const script = `if (doc['machine.ram'].size() == 0) return -1;
          else return doc['machine.ram'].value / (1024 * 1024 * 1024);
        `;
        await PageObjects.settings.addScriptedField(scriptedPainlessFieldName, 'painless', 'number', null, '1', script);
        await retry.try(async function () {
          expect(parseInt(await PageObjects.settings.getScriptedFieldsTabCount())).to.be(startingCount + 1);
        });
      });

      it('should see scripted field value in Discover', async function () {
        const fromTime = '2015-09-17 06:31:44.000';
        const toTime = '2015-09-18 18:31:44.000';
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
        await PageObjects.visualize.waitForVisualization();
        await PageObjects.discover.clickFieldListItem(scriptedPainlessFieldName);
        await retry.try(async function () {
          await PageObjects.discover.clickFieldListItemAdd(scriptedPainlessFieldName);
        });
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.visualize.waitForVisualization();
        await retry.try(async function () {
          const rowData = await PageObjects.discover.getDocTableIndex(1);
          expect(rowData).to.be('Sep 18, 2015 @ 18:20:57.916\n18');
        });
      });

      it('should filter by scripted field value in Discover', async function () {
        await PageObjects.discover.clickFieldListItem(scriptedPainlessFieldName);
        await log.debug('filter by the first value (14) in the expanded scripted field list');
        await PageObjects.discover.clickFieldListPlusFilter(scriptedPainlessFieldName, '14');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.visualize.waitForVisualization();
        await retry.try(async function () {
          expect(await PageObjects.discover.getHitCount()).to.be('31');
        });
      });

      it('should visualize scripted field in vertical bar chart', async function () {
        const expectedChartValues = [ ['14', '31'], ['10', '29'], ['7', '24'], ['11', '24'], ['12', '23'],
          ['20', '23'], ['19', '21'], ['6', '20'], ['17', '20'], ['30', '20'], ['13', '19'], ['18', '18'],
          ['16', '17'], ['5', '16'], ['8', '16'], ['15', '14'], ['3', '13'], ['2', '12'], ['9', '10'], ['4', '9']
        ];
        await filterBar.removeAllFilters();
        await PageObjects.discover.clickFieldListItemVisualize(scriptedPainlessFieldName);
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.visualize.waitForVisualization();
        await inspector.open();
        await inspector.setTablePageSize(50);
        await inspector.expectTableData(expectedChartValues);
      });
    });

    describe('creating and using Painless string scripted fields', function describeIndexTests() {
      const scriptedPainlessFieldName2 = 'painString';

      it('should create scripted field', async function () {
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaIndexPatterns();
        await PageObjects.settings.clickIndexPatternLogstash();
        const startingCount = parseInt(await PageObjects.settings.getScriptedFieldsTabCount());
        await PageObjects.settings.clickScriptedFieldsTab();
        await log.debug('add scripted field');
        await PageObjects.settings
          .addScriptedField(scriptedPainlessFieldName2, 'painless', 'string', null, '1',
            'if (doc[\'response.raw\'].value == \'200\') { return \'good\'} else { return \'bad\'}');
        await retry.try(async function () {
          expect(parseInt(await PageObjects.settings.getScriptedFieldsTabCount())).to.be(startingCount + 1);
        });
      });

      it('should see scripted field value in Discover', async function () {
        const fromTime = '2015-09-17 06:31:44.000';
        const toTime = '2015-09-18 18:31:44.000';
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
        await PageObjects.visualize.waitForVisualization();
        await PageObjects.discover.clickFieldListItem(scriptedPainlessFieldName2);
        await retry.try(async function () {
          await PageObjects.discover.clickFieldListItemAdd(scriptedPainlessFieldName2);
        });
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.visualize.waitForVisualization();
        await retry.try(async function () {
          const rowData = await PageObjects.discover.getDocTableIndex(1);
          expect(rowData).to.be('Sep 18, 2015 @ 18:20:57.916\ngood');

        });
      });

      it('should filter by scripted field value in Discover', async function () {
        await PageObjects.discover.clickFieldListItem(scriptedPainlessFieldName2);
        await log.debug('filter by "bad" in the expanded scripted field list');
        await PageObjects.discover.clickFieldListPlusFilter(scriptedPainlessFieldName2, 'bad');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.visualize.waitForVisualization();
        await retry.try(async function () {
          expect(await PageObjects.discover.getHitCount()).to.be('27');
        });
        await filterBar.removeAllFilters();
      });

      it('should visualize scripted field in vertical bar chart', async function () {
        await PageObjects.discover.clickFieldListItemVisualize(scriptedPainlessFieldName2);
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.visualize.waitForVisualization();
        await inspector.open();
        await inspector.expectTableData([
          ['good', '359'],
          ['bad', '27']
        ]);
      });
    });

    describe('creating and using Painless boolean scripted fields', function describeIndexTests() {
      const scriptedPainlessFieldName2 = 'painBool';

      it('should create scripted field', async function () {
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaIndexPatterns();
        await PageObjects.settings.clickIndexPatternLogstash();
        const startingCount = parseInt(await PageObjects.settings.getScriptedFieldsTabCount());
        await PageObjects.settings.clickScriptedFieldsTab();
        await log.debug('add scripted field');
        await PageObjects.settings
          .addScriptedField(scriptedPainlessFieldName2, 'painless', 'boolean', null, '1',
            'doc[\'response.raw\'].value == \'200\'');
        await retry.try(async function () {
          expect(parseInt(await PageObjects.settings.getScriptedFieldsTabCount())).to.be(startingCount + 1);
        });
      });

      it('should see scripted field value in Discover', async function () {
        const fromTime = '2015-09-17 06:31:44.000';
        const toTime = '2015-09-18 18:31:44.000';
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
        await PageObjects.visualize.waitForVisualization();
        await PageObjects.discover.clickFieldListItem(scriptedPainlessFieldName2);
        await retry.try(async function () {
          await PageObjects.discover.clickFieldListItemAdd(scriptedPainlessFieldName2);
        });
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.visualize.waitForVisualization();
        await retry.try(async function () {
          const rowData = await PageObjects.discover.getDocTableIndex(1);
          expect(rowData).to.be('Sep 18, 2015 @ 18:20:57.916\ntrue');

        });
      });

      it('should filter by scripted field value in Discover', async function () {
        await PageObjects.discover.clickFieldListItem(scriptedPainlessFieldName2);
        await log.debug('filter by "true" in the expanded scripted field list');
        await PageObjects.discover.clickFieldListPlusFilter(scriptedPainlessFieldName2, 'true');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.visualize.waitForVisualization();
        await retry.try(async function () {
          expect(await PageObjects.discover.getHitCount()).to.be('359');
        });
        await filterBar.removeAllFilters();
      });

      it('should visualize scripted field in vertical bar chart', async function () {
        await PageObjects.discover.clickFieldListItemVisualize(scriptedPainlessFieldName2);
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.visualize.waitForVisualization();
        await inspector.open();
        await inspector.expectTableData([
          ['true', '359'],
          ['false', '27']
        ]);
      });
    });

    describe('creating and using Painless date scripted fields', function describeIndexTests() {
      const scriptedPainlessFieldName2 = 'painDate';

      it('should create scripted field', async function () {
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaIndexPatterns();
        await PageObjects.settings.clickIndexPatternLogstash();
        const startingCount = parseInt(await PageObjects.settings.getScriptedFieldsTabCount());
        await PageObjects.settings.clickScriptedFieldsTab();
        await log.debug('add scripted field');
        await PageObjects.settings
          .addScriptedField(scriptedPainlessFieldName2, 'painless', 'date',
            { format: 'date', datePattern: 'YYYY-MM-DD HH:00' }, '1',
            'doc[\'utc_time\'].value.getMillis() + (1000) * 60 * 60');
        await retry.try(async function () {
          expect(parseInt(await PageObjects.settings.getScriptedFieldsTabCount())).to.be(startingCount + 1);
        });
      });

      it('should see scripted field value in Discover', async function () {
        const fromTime = '2015-09-17 19:22:00.000';
        const toTime = '2015-09-18 07:00:00.000';
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
        await PageObjects.visualize.waitForVisualization();
        await PageObjects.discover.clickFieldListItem(scriptedPainlessFieldName2);
        await retry.try(async function () {
          await PageObjects.discover.clickFieldListItemAdd(scriptedPainlessFieldName2);
        });
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.visualize.waitForVisualization();
        await retry.try(async function () {
          const rowData = await PageObjects.discover.getDocTableIndex(1);
          expect(rowData).to.be('Sep 18, 2015 @ 06:52:55.953\n2015-09-18 07:00');
        });
      });

      it('should filter by scripted field value in Discover', async function () {
        await PageObjects.discover.clickFieldListItem(scriptedPainlessFieldName2);
        await log.debug('filter by "2015-09-17 23:00" in the expanded scripted field list');
        await PageObjects.discover.clickFieldListPlusFilter(scriptedPainlessFieldName2, '2015-09-17 23:00');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.visualize.waitForVisualization();
        await retry.try(async function () {
          expect(await PageObjects.discover.getHitCount()).to.be('1');
        });
        await filterBar.removeAllFilters();
      });

      it('should visualize scripted field in vertical bar chart', async function () {
        await PageObjects.discover.clickFieldListItemVisualize(scriptedPainlessFieldName2);
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.visualize.waitForVisualization();
        await inspector.open();
        await inspector.setTablePageSize(50);
        await inspector.expectTableData([
          ['2015-09-17 20:00', '1'],
          ['2015-09-17 21:00', '1'],
          ['2015-09-17 23:00', '1'],
          ['2015-09-18 00:00', '1'],
          ['2015-09-18 03:00', '1'],
          ['2015-09-18 04:00', '1'],
          ['2015-09-18 04:00', '1'],
          ['2015-09-18 04:00', '1'],
          ['2015-09-18 04:00', '1'],
          ['2015-09-18 05:00', '1'],
          ['2015-09-18 05:00', '1'],
          ['2015-09-18 05:00', '1'],
          ['2015-09-18 05:00', '1'],
          ['2015-09-18 06:00', '1'],
          ['2015-09-18 06:00', '1'],
          ['2015-09-18 06:00', '1'],
          ['2015-09-18 06:00', '1'],
          ['2015-09-18 07:00', '1'],
          ['2015-09-18 07:00', '1'],
          ['2015-09-18 07:00', '1'],
        ]);
      });
    });
  });
}
