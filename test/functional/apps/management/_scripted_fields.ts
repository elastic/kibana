/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const log = getService('log');
  const browser = getService('browser');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const filterBar = getService('filterBar');
  const PageObjects = getPageObjects([
    'common',
    'header',
    'settings',
    'visualize',
    'discover',
    'timePicker',
  ]);

  describe('scripted fields', function () {
    this.tags(['skipFirefox']);

    before(async function () {
      await browser.setWindowSize(1200, 800);
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.uiSettings.replace({});
      await kibanaServer.uiSettings.update({ 'doc_table:legacy': true });
    });

    after(async function afterAll() {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.uiSettings.replace({});
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
        const startingCount = parseInt(await PageObjects.settings.getScriptedFieldsTabCount(), 10);
        await PageObjects.settings.clickScriptedFieldsTab();
        await log.debug('add scripted field');
        const script = `1`;
        await PageObjects.settings.addScriptedField(
          scriptedPainlessFieldName,
          'painless',
          'number',
          null,
          '1',
          script
        );
        await retry.try(async function () {
          expect(parseInt(await PageObjects.settings.getScriptedFieldsTabCount(), 10)).to.be(
            startingCount + 1
          );
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
        const startingCount = parseInt(await PageObjects.settings.getScriptedFieldsTabCount(), 10);
        await PageObjects.settings.clickScriptedFieldsTab();
        await log.debug('add scripted field');
        const script = `if (doc['machine.ram'].size() == 0) return -1;
          else return doc['machine.ram'].value / (1024 * 1024 * 1024);
        `;
        await PageObjects.settings.addScriptedField(
          scriptedPainlessFieldName,
          'painless',
          'number',
          null,
          '100',
          script
        );
        await retry.try(async function () {
          expect(parseInt(await PageObjects.settings.getScriptedFieldsTabCount(), 10)).to.be(
            startingCount + 1
          );
        });
      });

      it('should see scripted field value in Discover', async function () {
        const fromTime = 'Sep 17, 2015 @ 06:31:44.000';
        const toTime = 'Sep 18, 2015 @ 18:31:44.000';
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);

        await PageObjects.discover.clickFieldListItem(scriptedPainlessFieldName);
        await retry.try(async function () {
          await PageObjects.discover.clickFieldListItemAdd(scriptedPainlessFieldName);
        });
        await PageObjects.header.waitUntilLoadingHasFinished();

        await retry.try(async function () {
          const rowData = await PageObjects.discover.getDocTableIndexLegacy(1);
          expect(rowData).to.be('Sep 18, 2015 @ 18:20:57.916\n18');
        });
      });

      // add a test to sort numeric scripted field
      it('should sort scripted field value in Discover', async function () {
        await testSubjects.click(`docTableHeaderFieldSort_${scriptedPainlessFieldName}`);
        // after the first click on the scripted field, it becomes secondary sort after time.
        // click on the timestamp twice to make it be the secondary sort key.
        await testSubjects.click('docTableHeaderFieldSort_@timestamp');
        await testSubjects.click('docTableHeaderFieldSort_@timestamp');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await retry.try(async function () {
          const rowData = await PageObjects.discover.getDocTableIndexLegacy(1);
          expect(rowData).to.be('Sep 17, 2015 @ 10:53:14.181\n-1');
        });

        await testSubjects.click(`docTableHeaderFieldSort_${scriptedPainlessFieldName}`);
        await PageObjects.header.waitUntilLoadingHasFinished();
        await retry.try(async function () {
          const rowData = await PageObjects.discover.getDocTableIndexLegacy(1);
          expect(rowData).to.be('Sep 17, 2015 @ 06:32:29.479\n20');
        });
      });

      it('should filter by scripted field value in Discover', async function () {
        await PageObjects.discover.clickFieldListItem(scriptedPainlessFieldName);
        await log.debug('filter by the first value (14) in the expanded scripted field list');
        await PageObjects.discover.clickFieldListPlusFilter(scriptedPainlessFieldName, '14');
        await PageObjects.header.waitUntilLoadingHasFinished();

        await retry.try(async function () {
          expect(await PageObjects.discover.getHitCount()).to.be('31');
        });
      });

      it('should visualize scripted field in vertical bar chart', async function () {
        await filterBar.removeAllFilters();
        await PageObjects.discover.clickFieldListItemVisualize(scriptedPainlessFieldName);
        await PageObjects.header.waitUntilLoadingHasFinished();
        // verify Lens opens a visualization
        expect(await testSubjects.getVisibleTextAll('lns-dimensionTrigger')).to.contain(
          '@timestamp',
          'Median of ram_Pain1'
        );
      });
    });

    describe('creating and using Painless string scripted fields', function describeIndexTests() {
      const scriptedPainlessFieldName2 = 'painString';

      it('should create scripted field', async function () {
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaIndexPatterns();
        await PageObjects.settings.clickIndexPatternLogstash();
        const startingCount = parseInt(await PageObjects.settings.getScriptedFieldsTabCount(), 10);
        await PageObjects.settings.clickScriptedFieldsTab();
        await log.debug('add scripted field');
        await PageObjects.settings.addScriptedField(
          scriptedPainlessFieldName2,
          'painless',
          'string',
          null,
          '1',
          "if (doc['response.raw'].value == '200') { return 'good'} else { return 'bad'}"
        );
        await retry.try(async function () {
          expect(parseInt(await PageObjects.settings.getScriptedFieldsTabCount(), 10)).to.be(
            startingCount + 1
          );
        });
      });

      it('should see scripted field value in Discover', async function () {
        const fromTime = 'Sep 17, 2015 @ 06:31:44.000';
        const toTime = 'Sep 18, 2015 @ 18:31:44.000';
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);

        await PageObjects.discover.clickFieldListItem(scriptedPainlessFieldName2);
        await retry.try(async function () {
          await PageObjects.discover.clickFieldListItemAdd(scriptedPainlessFieldName2);
        });
        await PageObjects.header.waitUntilLoadingHasFinished();

        await retry.try(async function () {
          const rowData = await PageObjects.discover.getDocTableIndexLegacy(1);
          expect(rowData).to.be('Sep 18, 2015 @ 18:20:57.916\ngood');
        });
      });

      // add a test to sort string scripted field
      it('should sort scripted field value in Discover', async function () {
        await testSubjects.click(`docTableHeaderFieldSort_${scriptedPainlessFieldName2}`);
        // after the first click on the scripted field, it becomes secondary sort after time.
        // click on the timestamp twice to make it be the secondary sort key.
        await testSubjects.click('docTableHeaderFieldSort_@timestamp');
        await testSubjects.click('docTableHeaderFieldSort_@timestamp');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await retry.try(async function () {
          const rowData = await PageObjects.discover.getDocTableIndexLegacy(1);
          expect(rowData).to.be('Sep 17, 2015 @ 09:48:40.594\nbad');
        });

        await testSubjects.click(`docTableHeaderFieldSort_${scriptedPainlessFieldName2}`);
        await PageObjects.header.waitUntilLoadingHasFinished();
        await retry.try(async function () {
          const rowData = await PageObjects.discover.getDocTableIndexLegacy(1);
          expect(rowData).to.be('Sep 17, 2015 @ 06:32:29.479\ngood');
        });
      });

      it('should filter by scripted field value in Discover', async function () {
        await PageObjects.discover.clickFieldListItem(scriptedPainlessFieldName2);
        await log.debug('filter by "bad" in the expanded scripted field list');
        await PageObjects.discover.clickFieldListPlusFilter(scriptedPainlessFieldName2, 'bad');
        await PageObjects.header.waitUntilLoadingHasFinished();

        await retry.try(async function () {
          expect(await PageObjects.discover.getHitCount()).to.be('27');
        });
        await filterBar.removeAllFilters();
      });

      it('should visualize scripted field in vertical bar chart', async function () {
        await PageObjects.discover.clickFieldListItemVisualize(scriptedPainlessFieldName2);
        await PageObjects.header.waitUntilLoadingHasFinished();
        // verify Lens opens a visualization
        expect(await testSubjects.getVisibleTextAll('lns-dimensionTrigger')).to.contain(
          'Top 5 values of painString'
        );
      });
    });

    describe('creating and using Painless boolean scripted fields', function describeIndexTests() {
      const scriptedPainlessFieldName2 = 'painBool';

      it('should create scripted field', async function () {
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaIndexPatterns();
        await PageObjects.settings.clickIndexPatternLogstash();
        const startingCount = parseInt(await PageObjects.settings.getScriptedFieldsTabCount(), 10);
        await PageObjects.settings.clickScriptedFieldsTab();
        await log.debug('add scripted field');
        await PageObjects.settings.addScriptedField(
          scriptedPainlessFieldName2,
          'painless',
          'boolean',
          null,
          '1',
          "doc['response.raw'].value == '200'"
        );
        await retry.try(async function () {
          expect(parseInt(await PageObjects.settings.getScriptedFieldsTabCount(), 10)).to.be(
            startingCount + 1
          );
        });
      });

      it('should see scripted field value in Discover', async function () {
        const fromTime = 'Sep 17, 2015 @ 06:31:44.000';
        const toTime = 'Sep 18, 2015 @ 18:31:44.000';
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);

        await PageObjects.discover.clickFieldListItem(scriptedPainlessFieldName2);
        await retry.try(async function () {
          await PageObjects.discover.clickFieldListItemAdd(scriptedPainlessFieldName2);
        });
        await PageObjects.header.waitUntilLoadingHasFinished();

        await retry.try(async function () {
          const rowData = await PageObjects.discover.getDocTableIndexLegacy(1);
          expect(rowData).to.be('Sep 18, 2015 @ 18:20:57.916\ntrue');
        });
      });

      it('should filter by scripted field value in Discover', async function () {
        await PageObjects.discover.clickFieldListItem(scriptedPainlessFieldName2);
        await log.debug('filter by "true" in the expanded scripted field list');
        await PageObjects.discover.clickFieldListPlusFilter(scriptedPainlessFieldName2, 'true');
        await PageObjects.header.waitUntilLoadingHasFinished();

        await retry.try(async function () {
          expect(await PageObjects.discover.getHitCount()).to.be('359');
        });
        await filterBar.removeAllFilters();
      });

      // add a test to sort boolean
      // existing bug: https://github.com/elastic/kibana/issues/75519 hence the issue is skipped.
      it.skip('should sort scripted field value in Discover', async function () {
        await testSubjects.click(`docTableHeaderFieldSort_${scriptedPainlessFieldName2}`);
        // after the first click on the scripted field, it becomes secondary sort after time.
        // click on the timestamp twice to make it be the secondary sort key.
        await testSubjects.click('docTableHeaderFieldSort_@timestamp');
        await testSubjects.click('docTableHeaderFieldSort_@timestamp');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await retry.try(async function () {
          const rowData = await PageObjects.discover.getDocTableIndexLegacy(1);
          expect(rowData).to.be('updateExpectedResultHere\ntrue');
        });

        await testSubjects.click(`docTableHeaderFieldSort_${scriptedPainlessFieldName2}`);
        await PageObjects.header.waitUntilLoadingHasFinished();
        await retry.try(async function () {
          const rowData = await PageObjects.discover.getDocTableIndexLegacy(1);
          expect(rowData).to.be('updateExpectedResultHere\nfalse');
        });
      });

      it('should visualize scripted field in vertical bar chart', async function () {
        await PageObjects.discover.clickFieldListItemVisualize(scriptedPainlessFieldName2);
        await PageObjects.header.waitUntilLoadingHasFinished();
        // verify Lens opens a visualization
        expect(await testSubjects.getVisibleTextAll('lns-dimensionTrigger')).to.contain(
          'Top values of painBool'
        );
      });
    });

    describe('creating and using Painless date scripted fields', function describeIndexTests() {
      const scriptedPainlessFieldName2 = 'painDate';

      it('should create scripted field', async function () {
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaIndexPatterns();
        await PageObjects.settings.clickIndexPatternLogstash();
        const startingCount = parseInt(await PageObjects.settings.getScriptedFieldsTabCount(), 10);
        await PageObjects.settings.clickScriptedFieldsTab();
        await log.debug('add scripted field');
        await PageObjects.settings.addScriptedField(
          scriptedPainlessFieldName2,
          'painless',
          'date',
          { format: 'date', datePattern: 'YYYY-MM-DD HH:00' },
          '1',
          "doc['utc_time'].value.toEpochMilli() + (1000) * 60 * 60"
        );
        await retry.try(async function () {
          expect(parseInt(await PageObjects.settings.getScriptedFieldsTabCount(), 10)).to.be(
            startingCount + 1
          );
        });
      });

      it('should see scripted field value in Discover', async function () {
        const fromTime = 'Sep 17, 2015 @ 19:22:00.000';
        const toTime = 'Sep 18, 2015 @ 07:00:00.000';
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);

        await PageObjects.discover.clickFieldListItem(scriptedPainlessFieldName2);
        await retry.try(async function () {
          await PageObjects.discover.clickFieldListItemAdd(scriptedPainlessFieldName2);
        });
        await PageObjects.header.waitUntilLoadingHasFinished();

        await retry.try(async function () {
          const rowData = await PageObjects.discover.getDocTableIndexLegacy(1);
          expect(rowData).to.be('Sep 18, 2015 @ 06:52:55.953\n2015-09-18 07:00');
        });
      });

      // add a test to sort date scripted field
      // https://github.com/elastic/kibana/issues/75711
      it.skip('should sort scripted field value in Discover', async function () {
        await testSubjects.click(`docTableHeaderFieldSort_${scriptedPainlessFieldName2}`);
        // after the first click on the scripted field, it becomes secondary sort after time.
        // click on the timestamp twice to make it be the secondary sort key.
        await testSubjects.click('docTableHeaderFieldSort_@timestamp');
        await testSubjects.click('docTableHeaderFieldSort_@timestamp');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await retry.try(async function () {
          const rowData = await PageObjects.discover.getDocTableIndexLegacy(1);
          expect(rowData).to.be('updateExpectedResultHere\n2015-09-18 07:00');
        });

        await testSubjects.click(`docTableHeaderFieldSort_${scriptedPainlessFieldName2}`);
        await PageObjects.header.waitUntilLoadingHasFinished();
        await retry.try(async function () {
          const rowData = await PageObjects.discover.getDocTableIndexLegacy(1);
          expect(rowData).to.be('updateExpectedResultHere\n2015-09-18 07:00');
        });
      });

      it('should filter by scripted field value in Discover', async function () {
        await PageObjects.discover.clickFieldListItem(scriptedPainlessFieldName2);
        await log.debug('filter by "Sep 17, 2015 @ 23:00" in the expanded scripted field list');
        await PageObjects.discover.clickFieldListPlusFilter(
          scriptedPainlessFieldName2,
          '1442531297065'
        );
        await PageObjects.header.waitUntilLoadingHasFinished();

        await retry.try(async function () {
          expect(await PageObjects.discover.getHitCount()).to.be('1');
        });
        await filterBar.removeAllFilters();
      });

      it('should visualize scripted field in vertical bar chart', async function () {
        await PageObjects.discover.clickFieldListItemVisualize(scriptedPainlessFieldName2);
        await PageObjects.header.waitUntilLoadingHasFinished();
        // verify Lens opens a visualization
        expect(await testSubjects.getVisibleTextAll('lns-dimensionTrigger')).to.contain('painDate');
      });
    });
  });
}
