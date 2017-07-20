// Tests for 5 scripted fields;
// 1. Lucene expression (number type)
// 2. Painless (number type)
// 3. Painless (string type)
// 3. Painless (boolean type)
// 3. Painless (date type)
//
// Each of these scripted fields has 4 tests (12 tests total);
// 1. Create scripted field
// 2. See the expected value of the scripted field in Discover doc view
// 3. Filter in Discover by the scripted field
// 4. Visualize with aggregation on the scripted field by clicking discover.clickFieldListItemVisualize

import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const kibanaServer = getService('kibanaServer');
  const log = getService('log');
  const remote = getService('remote');
  const retry = getService('retry');
  const screenshots = getService('screenshots');
  const PageObjects = getPageObjects(['common', 'header', 'settings', 'visualize', 'discover']);

  describe('scripted fields', () => {

    before(async function () {
      await remote.setWindowSize(1200,800);
      // delete .kibana index and then wait for Kibana to re-create it
      await kibanaServer.uiSettings.replace({ 'dateFormat:tz':'UTC' });
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndices();
      await PageObjects.settings.createIndexPattern();
      await kibanaServer.uiSettings.update({ 'dateFormat:tz':'UTC' });
    });

    after(async function afterAll() {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndices();
      await PageObjects.settings.removeIndexPattern();
    });

    describe('creating and using Lucence expression scripted fields', function describeIndexTests() {
      const scriptedExpressionFieldName = 'ram_expr1';

      it('should create scripted field', async function () {
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaIndices();
        const startingCount = parseInt(await PageObjects.settings.getScriptedFieldsTabCount());
        await PageObjects.settings.clickScriptedFieldsTab();
        await log.debug('add scripted field');
        await PageObjects.settings
          .addScriptedField(scriptedExpressionFieldName,
            'expression', 'number', null, '1', 'doc[\'machine.ram\'].value / (1024 * 1024 * 1024)'
          );
        await retry.try(async function () {
          expect(parseInt(await PageObjects.settings.getScriptedFieldsTabCount())).to.be(startingCount + 1);
        });
      });

      it('should see scripted field value in Discover', async function () {
        const fromTime = '2015-09-17 06:31:44.000';
        const toTime = '2015-09-18 18:31:44.000';
        await PageObjects.common.navigateToApp('discover');
        await log.debug('setAbsoluteRange (' + fromTime + ') to (' + toTime + ')');
        await PageObjects.header.setAbsoluteRange(fromTime, toTime);
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.visualize.waitForVisualization();
        await PageObjects.discover.clickFieldListItem(scriptedExpressionFieldName);
        await retry.try(async function () {
          await PageObjects.discover.clickFieldListItemAdd(scriptedExpressionFieldName);
        });
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.visualize.waitForVisualization();
        await retry.try(async function () {
          const rowData = await PageObjects.discover.getDocTableIndex(1);
          expect(rowData).to.be('September 18th 2015, 18:20:57.916\n18');
        });
      });

      it('should filter by scripted field value in Discover', async function () {
        await PageObjects.discover.clickFieldListItem(scriptedExpressionFieldName);
        await log.debug('filter by the first value (14) in the expanded scripted field list');
        await PageObjects.discover.clickFieldListPlusFilter(scriptedExpressionFieldName, '14');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.visualize.waitForVisualization();
        await retry.try(async function () {
          expect(await PageObjects.discover.getHitCount()).to.be('31');
        });
      });

      it('should visualize scripted field in vertical bar chart', async function () {
        const expectedChartValues = [ '14', '31', '10', '29', '7', '24', '11', '24', '12', '23',
          '20', '23', '19', '21', '6', '20', '17', '20', '30', '20', '13', '19', '18', '18', '16', '17', '5', '16',
          '8', '16', '15', '14', '3', '13', '2', '12', '9', '10', '4', '9'
        ];
        await PageObjects.discover.removeAllFilters();
        await PageObjects.discover.clickFieldListItemVisualize(scriptedExpressionFieldName);
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.visualize.waitForVisualization();
        await PageObjects.visualize.collapseChart();
        await PageObjects.settings.setPageSize('All');
        const data = await PageObjects.visualize.getDataTableData();
        await log.debug('getDataTableData = ' + data.split('\n'));
        await log.debug('data=' + data);
        await log.debug('data.length=' + data.length);
        await screenshots.take('Visualize-vertical-bar-chart');
        expect(data.trim().split('\n')).to.eql(expectedChartValues);
      });
    });

    describe('creating and using Painless numeric scripted fields', function describeIndexTests() {
      const scriptedPainlessFieldName = 'ram_Pain1';

      it('should create scripted field', async function () {
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaIndices();
        const startingCount = parseInt(await PageObjects.settings.getScriptedFieldsTabCount());
        await PageObjects.settings.clickScriptedFieldsTab();
        await log.debug('add scripted field');
        const script = 'doc[\'machine.ram\'].value / (1024 * 1024 * 1024)';
        await PageObjects.settings.addScriptedField(scriptedPainlessFieldName, 'painless', 'number', null, '1', script);
        await retry.try(async function () {
          expect(parseInt(await PageObjects.settings.getScriptedFieldsTabCount())).to.be(startingCount + 1);
        });
      });

      it('should see scripted field value in Discover', async function () {
        const fromTime = '2015-09-17 06:31:44.000';
        const toTime = '2015-09-18 18:31:44.000';
        await PageObjects.common.navigateToApp('discover');
        await log.debug('setAbsoluteRange (' + fromTime + ') to (' + toTime + ')');
        await PageObjects.header.setAbsoluteRange(fromTime, toTime);
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.visualize.waitForVisualization();
        await PageObjects.discover.clickFieldListItem(scriptedPainlessFieldName);
        await retry.try(async function () {
          await PageObjects.discover.clickFieldListItemAdd(scriptedPainlessFieldName);
        });
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.visualize.waitForVisualization();
        await retry.try(async function () {
          const rowData = await PageObjects.discover.getDocTableIndex(1);
          expect(rowData).to.be('September 18th 2015, 18:20:57.916\n18');
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
        const expectedChartValues = [ '14', '31', '10', '29', '7', '24', '11', '24', '12', '23',
          '20', '23', '19', '21', '6', '20', '17', '20', '30', '20', '13', '19', '18', '18', '16', '17', '5', '16',
          '8', '16', '15', '14', '3', '13', '2', '12', '9', '10', '4', '9'
        ];
        await PageObjects.discover.removeAllFilters();
        await PageObjects.discover.clickFieldListItemVisualize(scriptedPainlessFieldName);
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.visualize.waitForVisualization();
        await PageObjects.visualize.collapseChart();
        await PageObjects.settings.setPageSize('All');
        const data = await PageObjects.visualize.getDataTableData();
        await log.debug('getDataTableData = ' + data.split('\n'));
        await log.debug('data=' + data);
        await log.debug('data.length=' + data.length);
        await screenshots.take('Visualize-vertical-bar-chart');
        expect(data.trim().split('\n')).to.eql(expectedChartValues);
      });
    });

    describe('creating and using Painless string scripted fields', function describeIndexTests() {
      const scriptedPainlessFieldName2 = 'painString';

      it('should create scripted field', async function () {
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaIndices();
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
        await log.debug('setAbsoluteRange (' + fromTime + ') to (' + toTime + ')');
        await PageObjects.header.setAbsoluteRange(fromTime, toTime);
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.visualize.waitForVisualization();
        await PageObjects.discover.clickFieldListItem(scriptedPainlessFieldName2);
        await retry.try(async function () {
          await PageObjects.discover.clickFieldListItemAdd(scriptedPainlessFieldName2);
        });
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.visualize.waitForVisualization();
        await retry.try(async function () {
          const rowData = await PageObjects.discover.getDocTableIndex(1);
          expect(rowData).to.be('September 18th 2015, 18:20:57.916\ngood');

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
        await PageObjects.discover.removeAllFilters();
      });

      it('should visualize scripted field in vertical bar chart', async function () {
        await PageObjects.discover.clickFieldListItemVisualize(scriptedPainlessFieldName2);
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.visualize.waitForVisualization();
        await PageObjects.visualize.collapseChart();
        await PageObjects.settings.setPageSize('All');
        const data = await PageObjects.visualize.getDataTableData();
        await log.debug('getDataTableData = ' + data.split('\n'));
        await log.debug('data=' + data);
        await log.debug('data.length=' + data.length);
        expect(data.trim().split('\n')).to.eql([ 'good', '359', 'bad', '27' ]);
      });
    });

    describe('creating and using Painless boolean scripted fields', function describeIndexTests() {
      const scriptedPainlessFieldName2 = 'painBool';

      it('should create scripted field', async function () {
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaIndices();
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
        await log.debug('setAbsoluteRange (' + fromTime + ') to (' + toTime + ')');
        await PageObjects.header.setAbsoluteRange(fromTime, toTime);
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.visualize.waitForVisualization();
        await PageObjects.discover.clickFieldListItem(scriptedPainlessFieldName2);
        await retry.try(async function () {
          await PageObjects.discover.clickFieldListItemAdd(scriptedPainlessFieldName2);
        });
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.visualize.waitForVisualization();
        await retry.try(async function () {
          const rowData = await PageObjects.discover.getDocTableIndex(1);
          expect(rowData).to.be('September 18th 2015, 18:20:57.916\ntrue');

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
        await PageObjects.discover.removeAllFilters();
      });

      it('should visualize scripted field in vertical bar chart', async function () {
        await PageObjects.discover.clickFieldListItemVisualize(scriptedPainlessFieldName2);
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.visualize.waitForVisualization();
        await PageObjects.visualize.collapseChart();
        await PageObjects.settings.setPageSize('All');
        const data = await PageObjects.visualize.getDataTableData();
        await log.debug('getDataTableData = ' + data.split('\n'));
        await log.debug('data=' + data);
        await log.debug('data.length=' + data.length);
        expect(data.trim().split('\n')).to.eql([ 'true', '359', 'false', '27' ]);
      });
    });

    describe('creating and using Painless date scripted fields', function describeIndexTests() {
      const scriptedPainlessFieldName2 = 'painDate';

      it('should create scripted field', async function () {
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaIndices();
        const startingCount = parseInt(await PageObjects.settings.getScriptedFieldsTabCount());
        await PageObjects.settings.clickScriptedFieldsTab();
        await log.debug('add scripted field');
        await PageObjects.settings
          .addScriptedField(scriptedPainlessFieldName2, 'painless', 'date',
          { format: 'Date', datePattern: 'YYYY-MM-DD HH:00' }, '1',
          'doc[\'utc_time\'].value + (1000) * 60 * 60');
        await retry.try(async function () {
          expect(parseInt(await PageObjects.settings.getScriptedFieldsTabCount())).to.be(startingCount + 1);
        });
      });

      it('should see scripted field value in Discover', async function () {
        const fromTime = '2015-09-17 19:22:00.000';
        const toTime = '2015-09-18 07:00:00.000';
        await PageObjects.common.navigateToApp('discover');
        await log.debug('setAbsoluteRange (' + fromTime + ') to (' + toTime + ')');
        await PageObjects.header.setAbsoluteRange(fromTime, toTime);
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.visualize.waitForVisualization();
        await PageObjects.discover.clickFieldListItem(scriptedPainlessFieldName2);
        await retry.try(async function () {
          await PageObjects.discover.clickFieldListItemAdd(scriptedPainlessFieldName2);
        });
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.visualize.waitForVisualization();
        await retry.try(async function () {
          const rowData = await PageObjects.discover.getDocTableIndex(1);
          expect(rowData).to.be('September 18th 2015, 06:52:55.953\n2015-09-18 07:00');
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
        await PageObjects.discover.removeAllFilters();
      });

      it('should visualize scripted field in vertical bar chart', async function () {
        await PageObjects.discover.clickFieldListItemVisualize(scriptedPainlessFieldName2);
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.visualize.waitForVisualization();
        await PageObjects.visualize.collapseChart();
        await PageObjects.settings.setPageSize('All');
        const data = await PageObjects.visualize.getDataTableData();
        await log.debug('getDataTableData = ' + data.split('\n'));
        await log.debug('data=' + data);
        await log.debug('data.length=' + data.length);
        expect(data.trim().split('\n')).to.eql([
          '2015-09-17 20:00', '1',
          '2015-09-17 21:00', '1',
          '2015-09-17 23:00', '1',
          '2015-09-18 00:00', '1',
          '2015-09-18 03:00', '1',
          '2015-09-18 04:00', '1',
          '2015-09-18 04:00', '1',
          '2015-09-18 04:00', '1',
          '2015-09-18 04:00', '1',
          '2015-09-18 05:00', '1',
          '2015-09-18 05:00', '1',
          '2015-09-18 05:00', '1',
          '2015-09-18 05:00', '1',
          '2015-09-18 06:00', '1',
          '2015-09-18 06:00', '1',
          '2015-09-18 06:00', '1',
          '2015-09-18 06:00', '1',
          '2015-09-18 07:00', '1',
          '2015-09-18 07:00', '1',
          '2015-09-18 07:00', '1',
        ]);
      });
    });
  });
}
