
import expect from 'expect.js';

import {
  bdd,
  scenarioManager,
  esClient
} from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('creating and using scripted fields', function describeIndexTests() {

  const scriptedExpressionFieldName = 'ram_expr1';

  bdd.it('should create Lucence expression scripted field', async function () {
    // delete .kibana index and then wait for Kibana to re-create it
    await esClient.deleteAndUpdateConfigDoc();
    await PageObjects.settings.navigateTo();
    await PageObjects.settings.clickKibanaIndicies();
    await PageObjects.settings.createIndexPattern();
    await PageObjects.settings.clickScriptedFieldsTab();
    await PageObjects.common.debug('add scripted field');
    await PageObjects.settings
    // .addScriptedField(scriptedExpressionFieldName, 'painless', 'number', null, '1', 'doc[\'machine.ram\'].value / (1024 * 1024 * 1024)');
      .addScriptedField(scriptedExpressionFieldName,
        'expression', 'number', null, '1', 'doc[\'machine.ram\'].value / (1024 * 1024 * 1024)'
      );
    await PageObjects.common.try(async function() {
      expect(await PageObjects.settings.getScriptedFieldsTabCount()).to.be('1');
    });
  });

  bdd.it('should see Lucence expression scripted field value in Discover', async function () {
    const fromTime = '2015-09-17 06:31:44.000';
    const toTime = '2015-09-18 18:31:44.000';
    await PageObjects.common.navigateToApp('discover');
    await PageObjects.common.debug('setAbsoluteRange (' + fromTime + ') to (' + toTime + ')');
    await PageObjects.header.setAbsoluteRange(fromTime, toTime);
    await PageObjects.header.isGlobalLoadingIndicatorHidden();
    await PageObjects.visualize.waitForVisualization();
    await PageObjects.discover.clickFieldListItem(scriptedExpressionFieldName);
    await PageObjects.common.try(async function() {
      await PageObjects.discover.clickFieldListItemAdd(scriptedExpressionFieldName);
    });
    await PageObjects.header.isGlobalLoadingIndicatorHidden();
    await PageObjects.visualize.waitForVisualization();
    const rowData = await PageObjects.discover.getDocTableIndex(1);
    expect(rowData).to.be('September 18th 2015, 16:08:20.320 30');
  });

  bdd.it('should filter by expression scripted field value in Discover', async function () {
    await PageObjects.discover.clickFieldListItem(scriptedExpressionFieldName);
    await PageObjects.common.debug('filter by the first value (14) in the expanded scripted field list');
    await PageObjects.discover.clickFieldListPlusFilter(scriptedExpressionFieldName, '14');
    await PageObjects.header.isGlobalLoadingIndicatorHidden();
    await PageObjects.visualize.waitForVisualization();
    await PageObjects.common.try(async function() {
      expect(await PageObjects.discover.getHitCount()).to.be('29');
    });
  });

  bdd.it('should visualize Lucence expression scripted field in vertical bar chart', async function () {
    const expectedChartValues = [ 28, 28, 24, 23, 22, 22, 20, 20, 19, 18, 18, 17,
      16, 15, 14, 13, 12, 12, 9, 9
    ];
    await PageObjects.discover.removeAllFilters();
    await PageObjects.discover.clickFieldListItem(scriptedExpressionFieldName);
    await PageObjects.discover.clickFieldListItemVisualize(scriptedExpressionFieldName);
    await PageObjects.header.isGlobalLoadingIndicatorHidden();
    await PageObjects.visualize.waitForVisualization();
    // const data = await PageObjects.visualize.getBarChartData();
    // await PageObjects.common.debug('data=' + data);
    // await PageObjects.common.debug('data.length=' + data.length);
    // await PageObjects.common.saveScreenshot('Visualize-vertical-bar-chart');
    // expect(data).to.eql(expectedChartValues);
    await PageObjects.visualize.collapseChart();
    await PageObjects.settings.setPageSize('All');
    var data = await PageObjects.visualize.getDataTableData();
    await PageObjects.common.debug('getDataTableData = ' + data.split('\n'));
    await PageObjects.common.debug('data=' + data);
    await PageObjects.common.debug('data.length=' + data.length);
    await PageObjects.common.saveScreenshot('Visualize-vertical-bar-chart');
    expect(data.trim().split('\n')).to.eql(expectedChartValues);
  });

// ///////////////////////////////////////////////////
  const scriptedPainlessFieldName = 'ram_Pain1';

  bdd.it('should create Painless expression scripted field', async function () {
    await PageObjects.settings.navigateTo();
    await PageObjects.settings.clickKibanaIndicies();
    await PageObjects.settings.clickScriptedFieldsTab();
    await PageObjects.common.debug('add scripted field');
    await PageObjects.settings
      .addScriptedField(scriptedPainlessFieldName, 'painless', 'number', null, '1', 'doc[\'machine.ram\'].value / (1024 * 1024 * 1024)');
    await PageObjects.common.try(async function() {
      expect(await PageObjects.settings.getScriptedFieldsTabCount()).to.be('2');
    });
  });

  bdd.it('should see Lucence expression scripted field value in Discover', async function () {
    const fromTime = '2015-09-17 06:31:44.000';
    const toTime = '2015-09-18 18:31:44.000';
    await PageObjects.common.navigateToApp('discover');
    await PageObjects.common.debug('setAbsoluteRange (' + fromTime + ') to (' + toTime + ')');
    await PageObjects.header.setAbsoluteRange(fromTime, toTime);
    await PageObjects.header.isGlobalLoadingIndicatorHidden();
    await PageObjects.visualize.waitForVisualization();
    await PageObjects.discover.clickFieldListItem(scriptedPainlessFieldName);
    await PageObjects.common.try(async function() {
      await PageObjects.discover.clickFieldListItemAdd(scriptedPainlessFieldName);
    });
    await PageObjects.header.isGlobalLoadingIndicatorHidden();
    await PageObjects.visualize.waitForVisualization();
    const rowData = await PageObjects.discover.getDocTableIndex(1);
    expect(rowData).to.be('September 18th 2015, 16:08:20.320 30');
  });

  bdd.it('should filter by expression scripted field value in Discover', async function () {
    await PageObjects.discover.clickFieldListItem(scriptedPainlessFieldName);
    await PageObjects.common.debug('filter by the first value (14) in the expanded scripted field list');
    await PageObjects.discover.clickFieldListPlusFilter(scriptedPainlessFieldName, '14');
    await PageObjects.header.isGlobalLoadingIndicatorHidden();
    await PageObjects.visualize.waitForVisualization();
    await PageObjects.common.try(async function() {
      expect(await PageObjects.discover.getHitCount()).to.be('29');
    });
  });

  bdd.it('should visualize Lucence expression scripted field in vertical bar chart', async function () {
    const expectedChartValues = [ 28, 28, 24, 23, 22, 22, 20, 20, 19, 18, 18, 17,
      16, 15, 14, 13, 12, 12, 9, 9
    ];
    await PageObjects.discover.removeAllFilters();
    await PageObjects.discover.clickFieldListItem(scriptedPainlessFieldName);
    await PageObjects.discover.clickFieldListItemVisualize(scriptedPainlessFieldName);
    await PageObjects.header.isGlobalLoadingIndicatorHidden();
    await PageObjects.visualize.waitForVisualization();
    // const data = await PageObjects.visualize.getBarChartData();
    // await PageObjects.common.debug('data=' + data);
    // await PageObjects.common.debug('data.length=' + data.length);
    // await PageObjects.common.saveScreenshot('Visualize-vertical-bar-chart');
    // expect(data).to.eql(expectedChartValues);
    await PageObjects.visualize.collapseChart();
    await PageObjects.settings.setPageSize('All');
    var data = await PageObjects.visualize.getDataTableData();
    await PageObjects.common.debug('getDataTableData = ' + data.split('\n'));
    await PageObjects.common.debug('data=' + data);
    await PageObjects.common.debug('data.length=' + data.length);
    await PageObjects.common.saveScreenshot('Visualize-vertical-bar-chart');
    expect(data.trim().split('\n')).to.eql(expectedChartValues);
  });

  // ///////////////////////////////////////////////////
  const scriptedPainlessFieldName2 = 'painString';

  bdd.it('should create Painless expression scripted field', async function () {
    await PageObjects.settings.navigateTo();
    await PageObjects.settings.clickKibanaIndicies();
    await PageObjects.settings.clickScriptedFieldsTab();
    await PageObjects.common.debug('add scripted field');
    await PageObjects.settings
      .addScriptedField(scriptedPainlessFieldName2, 'painless', 'string', null, '1',
      'if (doc[\'response.raw\'].value == \'200\') { return \'good\'} else { return \'bad\'}');
      // 'if (doc[\'response.raw\'].value === 200) { return \'good\'} else { return \'bad\'}');
    await PageObjects.common.try(async function() {
      expect(await PageObjects.settings.getScriptedFieldsTabCount()).to.be('3');
    });
  });

  bdd.it('should see Lucence expression scripted field value in Discover', async function () {
    const fromTime = '2015-09-17 06:31:44.000';
    const toTime = '2015-09-18 18:31:44.000';
    await PageObjects.common.navigateToApp('discover');
    await PageObjects.common.debug('setAbsoluteRange (' + fromTime + ') to (' + toTime + ')');
    await PageObjects.header.setAbsoluteRange(fromTime, toTime);
    await PageObjects.header.isGlobalLoadingIndicatorHidden();
    await PageObjects.visualize.waitForVisualization();
    await PageObjects.discover.clickFieldListItem(scriptedPainlessFieldName2);
    await PageObjects.common.try(async function() {
      await PageObjects.discover.clickFieldListItemAdd(scriptedPainlessFieldName2);
    });
    await PageObjects.header.isGlobalLoadingIndicatorHidden();
    await PageObjects.visualize.waitForVisualization();
    const rowData = await PageObjects.discover.getDocTableIndex(1);
    expect(rowData).to.be('September 18th 2015, 16:08:20.320 good');
  });

  // bdd.it('should filter by expression scripted field value in Discover', async function () {
  //   await PageObjects.discover.clickFieldListItem(scriptedPainlessFieldName2);
  //   await PageObjects.common.debug('filter by the first value (14) in the expanded scripted field list');
  //   await PageObjects.discover.clickFieldListPlusFilter(scriptedPainlessFieldName2, 'bad');
  //   await PageObjects.header.isGlobalLoadingIndicatorHidden();
  //   await PageObjects.visualize.waitForVisualization();
  //   await PageObjects.common.try(async function() {
  //     expect(await PageObjects.discover.getHitCount()).to.be('29');
  //   });
  //   await PageObjects.discover.removeAllFilters();
  // });

  bdd.it('should visualize Lucence expression scripted field in vertical bar chart', async function () {
    const expectedChartValues = [ 334, 25 ];
    await PageObjects.discover.clickFieldListItem(scriptedPainlessFieldName2);
    await PageObjects.discover.clickFieldListItemVisualize(scriptedPainlessFieldName2);
    await PageObjects.header.isGlobalLoadingIndicatorHidden();
    await PageObjects.visualize.waitForVisualization();
    await PageObjects.visualize.collapseChart();
    await PageObjects.settings.setPageSize('All');
    var data = await PageObjects.visualize.getDataTableData();
    await PageObjects.common.debug('getDataTableData = ' + data.split('\n'));
    await PageObjects.common.debug('data=' + data);
    await PageObjects.common.debug('data.length=' + data.length);
    // await PageObjects.common.saveScreenshot('Visualize-vertical-bar-chart');
    expect(data.trim().split('\n')).to.eql(expectedChartValues);
  });



});
