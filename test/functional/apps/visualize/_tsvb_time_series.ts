/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { visualize, visualBuilder, timeToVisualize, dashboard } = getPageObjects([
    'visualBuilder',
    'visualize',
    'timeToVisualize',
    'dashboard',
  ]);
  const security = getService('security');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const filterBar = getService('filterBar');
  const elasticChart = getService('elasticChart');
  const log = getService('log');
  const browser = getService('browser');
  const kibanaServer = getService('kibanaServer');

  describe('visual builder', function describeIndexTests() {
    before(async () => {
      await security.testUser.setRoles([
        'kibana_admin',
        'long_window_logstash',
        'test_logstash_reader',
      ]);
      await visualize.initTests();
    });
    beforeEach(async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisualBuilder();
      await visualBuilder.checkVisualBuilderIsPresent();
    });

    describe('Time Series', () => {
      beforeEach(async () => {
        await visualBuilder.resetPage();
        await visualBuilder.clickPanelOptions('timeSeries');
        await visualBuilder.setDropLastBucket(true);
        await visualBuilder.clickDataTab('timeSeries');
      });

      describe('basics', () => {
        this.tags('includeFirefox');

        it('should render all necessary components', async () => {
          await visualBuilder.checkTimeSeriesChartIsPresent();
          await visualBuilder.checkTimeSeriesLegendIsPresent();
        });

        it('should show the correct count in the legend', async () => {
          await retry.try(async () => {
            const actualCount = await visualBuilder.getRhythmChartLegendValue();
            expect(actualCount).to.be('156');
          });
        });

        it('should show the correct count in the legend with 2h offset', async () => {
          await visualBuilder.clickSeriesOption();
          await visualBuilder.enterOffsetSeries('2h');
          const actualCount = await visualBuilder.getRhythmChartLegendValue();
          expect(actualCount).to.be('293');
        });

        it('should show the correct count in the legend with -2h offset', async () => {
          await visualBuilder.clickSeriesOption();
          await visualBuilder.enterOffsetSeries('-2h');
          const actualCount = await visualBuilder.getRhythmChartLegendValue();
          expect(actualCount).to.be('53');
        });

        it('should open color picker, deactivate panel and clone series', async () => {
          await visualBuilder.clickColorPicker();
          await visualBuilder.checkColorPickerPopUpIsPresent();
          await visualBuilder.clickColorPicker();

          await visualBuilder.changePanelPreview();
          await visualBuilder.checkPreviewIsDisabled();
          await visualBuilder.changePanelPreview();

          await visualBuilder.cloneSeries();
          const legend = await visualBuilder.getLegendItems();
          const series = await visualBuilder.getSeries();
          expect(legend.length).to.be(2);
          expect(series.length).to.be(2);
        });

        it('should show the correct count in the legend with custom numeric formatter', async () => {
          const expectedLegendValue = '$ 156';

          await visualBuilder.clickSeriesOption();
          await visualBuilder.changeDataFormatter('number');
          await visualBuilder.enterSeriesTemplate('$ {{value}}');
          await retry.try(async () => {
            const actualCount = await visualBuilder.getRhythmChartLegendValue();
            expect(actualCount).to.be(expectedLegendValue);
          });
        });

        it('should show the correct count in the legend with percent formatter', async () => {
          const expectedLegendValue = '15,600%';

          await visualBuilder.clickSeriesOption();
          await visualBuilder.changeDataFormatter('percent');
          const actualCount = await visualBuilder.getRhythmChartLegendValue();
          expect(actualCount).to.be(expectedLegendValue);
        });

        it('should show the correct count in the legend with bytes formatter', async () => {
          const expectedLegendValue = '156B';

          await visualBuilder.clickSeriesOption();
          await visualBuilder.changeDataFormatter('bytes');
          const actualCount = await visualBuilder.getRhythmChartLegendValue();
          expect(actualCount).to.be(expectedLegendValue);
        });

        it('should show the correct count in the legend with "Human readable" duration formatter', async () => {
          await visualBuilder.clickSeriesOption();
          await visualBuilder.changeDataFormatter('duration');
          await visualBuilder.setDurationFormatterSettings({ to: 'Human readable' });
          const actualCountDefault = await visualBuilder.getRhythmChartLegendValue();
          expect(actualCountDefault).to.be('a few seconds');

          log.debug(`to: 'Human readable', from: 'Seconds'`);
          await visualBuilder.setDurationFormatterSettings({
            to: 'Human readable',
            from: 'Seconds',
          });
          const actualCountSec = await visualBuilder.getRhythmChartLegendValue();
          expect(actualCountSec).to.be('3 minutes');

          log.debug(`to: 'Human readable', from: 'Minutes'`);
          await visualBuilder.setDurationFormatterSettings({
            to: 'Human readable',
            from: 'Minutes',
          });
          const actualCountMin = await visualBuilder.getRhythmChartLegendValue();
          expect(actualCountMin).to.be('3 hours');
        });

        describe('Dark mode', () => {
          before(async () => {
            await kibanaServer.uiSettings.update({
              'theme:darkMode': true,
            });
          });

          it(`viz should have light class when background color is white`, async () => {
            await visualBuilder.clickPanelOptions('timeSeries');
            await visualBuilder.setBackgroundColor('#FFFFFF');

            expect(await visualBuilder.checkTimeSeriesIsLight()).to.be(true);
          });

          after(async () => {
            await kibanaServer.uiSettings.update({
              'theme:darkMode': false,
            });
          });
        });

        describe('Clicking on the chart', () => {
          it(`should create a filter`, async () => {
            await visualBuilder.setMetricsGroupByTerms('machine.os.raw', {
              include: 'win 7',
              exclude: 'ios',
            });
            await visualBuilder.clickSeriesOption();
            await testSubjects.click('visualizeSaveButton');

            await timeToVisualize.saveFromModal('My TSVB viz 1', {
              addToDashboard: 'new',
              saveToLibrary: false,
            });

            await dashboard.waitForRenderComplete();
            const el = await elasticChart.getCanvas();
            // click on specific coordinates
            await browser
              .getActions()
              .move({ x: 105, y: 115, origin: el._webElement })
              .click()
              .perform();

            await retry.try(async () => {
              await testSubjects.click('applyFiltersPopoverButton');
              await testSubjects.missingOrFail('applyFiltersPopoverButton');
            });

            const hasMachineRawFilter = await filterBar.hasFilter('machine.os.raw', 'win 7');
            expect(hasMachineRawFilter).to.be(true);
          });
        });
      });

      describe('Elastic charts', () => {
        beforeEach(async () => {
          await visualBuilder.toggleNewChartsLibraryWithDebug(true);
          await visualBuilder.clickPanelOptions('timeSeries');
          await visualBuilder.setIntervalValue('12h');
          await visualBuilder.clickDataTab('timeSeries');
        });

        it('should display correct chart data for average aggregation', async () => {
          const expectedChartData = [
            [1442707200000, 5765.324917218543],
            [1442750400000, 5635.074754378471],
            [1442793600000, 5798.3942307692305],
            [1442836800000, 5721.522355975924],
            [1442880000000, 5639.770887166236],
          ];
          await visualBuilder.selectAggType('Average');
          await visualBuilder.setFieldForAggregation('bytes');

          const chartData = await visualBuilder.getAreaChartData();
          expect(chartData).to.eql(expectedChartData);
        });

        it('should display correct chart data for percentile aggregation', async () => {
          const expectedChartData = [
            [1442707200000, 157580],
            [1442750400000, 226400],
            [1442793600000, 200920],
            [1442836800000, 202320],
            [1442880000000, 171720],
          ];
          await visualBuilder.selectAggType('Percentile');
          await visualBuilder.setFieldForAggregation('Memory');

          const chartData = await visualBuilder.getAreaChartData();
          expect(chartData).to.eql(expectedChartData);
        });

        it('should display correct chart data, label names and area colors for sum aggregation when split by terms', async () => {
          const firstAreaExpectedChartData = [
            [1442620800000, 0],
            [1442664000000, 0],
            [1442707200000, 11121455],
            [1442750400000, 10611145],
            [1442793600000, 10511084],
            [1442836800000, 10512452],
            [1442880000000, 10444101],
          ];
          const secondAreaExpectedChartData = [
            [1442620800000, 0],
            [1442664000000, 0],
            [1442707200000, 2807570],
            [1442750400000, 2580565],
            [1442793600000, 2755642],
            [1442836800000, 2795809],
            [1442880000000, 2651447],
          ];
          await visualBuilder.selectAggType('Sum');
          await visualBuilder.setFieldForAggregation('bytes');
          await visualBuilder.setMetricsGroupByTerms('type');

          const chartDebugData = await visualBuilder.getChartDebugState();
          const areasCount = (await visualBuilder.getChartItems(chartDebugData))?.length;
          const legendNames = await visualBuilder.getLegendNames(chartDebugData);
          const areaColors = await visualBuilder.getAreaChartColors(chartDebugData);
          const firstAreaChartData = await visualBuilder.getAreaChartData(chartDebugData);
          const secondAreaChartData = await visualBuilder.getAreaChartData(chartDebugData, 1);

          expect(areasCount).to.be(2);
          expect(legendNames).to.eql(['apache', 'nginx']);
          expect(areaColors).to.eql(['#54b399', '#6092c0']);
          expect(firstAreaChartData).to.eql(firstAreaExpectedChartData);
          expect(secondAreaChartData).to.eql(secondAreaExpectedChartData);
        });

        it('should display correct chart data, label names and area colors for min aggregation when split by filters', async () => {
          const firstAreaExpectedChartData = [
            [1442707200000, 219120],
            [1442750400000, 209840],
            [1442793600000, 200920],
            [1442836800000, 202320],
            [1442880000000, 201080],
          ];
          const secondAreaExpectedChartData = [
            [1442707200000, 293120],
            [1442750400000, 289960],
            [1442793600000, 297800],
            [1442836800000, 281040],
            [1442880000000, 282080],
          ];
          await visualBuilder.selectAggType('Min');
          await visualBuilder.setFieldForAggregation('memory');
          await visualBuilder.setMetricsGroupBy('filters');
          await visualBuilder.addGroupByFilterRow();
          await visualBuilder.setGroupByFilterQuery('bytes > 5000');
          await visualBuilder.setGroupByFilterQuery('bytes > 7000', 1);
          await visualBuilder.setGroupByFilterLabel('second', 1);
          await visualBuilder.setColorPickerValue('#00BCA3', 1);
          await visualBuilder.setColorPickerValue('#72CFC2', 2);

          const chartDebugData = await visualBuilder.getChartDebugState();
          const areasCount = (await visualBuilder.getChartItems(chartDebugData))?.length;
          const legendNames = await visualBuilder.getLegendNames(chartDebugData);
          const areaColors = await visualBuilder.getAreaChartColors(chartDebugData);
          const firstAreaChartData = await visualBuilder.getAreaChartData(chartDebugData);
          const secondAreaChartData = await visualBuilder.getAreaChartData(chartDebugData, 1);

          expect(areasCount).to.be(2);
          expect(legendNames).to.eql(['bytes > 5000', 'second']);
          expect(areaColors).to.eql(['rgba(0,188,163,1)', 'rgba(114,207,194,1)']);
          expect(firstAreaChartData).to.eql(firstAreaExpectedChartData);
          expect(secondAreaChartData).to.eql(secondAreaExpectedChartData);
        });

        it('should display cloned series and then change its chart type to bar', async () => {
          let areasCount = (await visualBuilder.getChartItems())?.length;
          expect(areasCount).to.be(1);

          await visualBuilder.cloneSeries();
          areasCount = (await visualBuilder.getChartItems())?.length;
          expect(areasCount).to.be(2);

          await visualBuilder.clickSeriesOption();
          await visualBuilder.setChartType('Bar');

          const chartDebugData = await visualBuilder.getChartDebugState();
          areasCount = (await visualBuilder.getChartItems(chartDebugData))?.length;
          const barsCount = (await visualBuilder.getChartItems(chartDebugData))?.length;
          expect(areasCount).to.be(1);
          expect(barsCount).to.be(1);
        });

        it('should display correct chart data for overridden index pattern', async () => {
          const expectedChartData = [
            [1442620800000, 4],
            [1442664000000, 3],
            [1442707200000, 5],
            [1442750400000, 2],
            [1442793600000, 6],
            [1442836800000, 1],
            [1442880000000, 6],
            [1442923200000, 1],
          ];
          await visualBuilder.clickSeriesOption();
          await visualBuilder.setOverrideIndexPattern(true);
          await visualBuilder.setIndexPatternValue('long-window-logstash-*');
          await visualBuilder.setIntervalValue('12h');

          const chartData = await visualBuilder.getAreaChartData();
          expect(chartData).to.eql(expectedChartData);
        });

        it('should display correct data for the selected interval', async () => {
          const expectedChartData = [
            [1442534400000, 0],
            [1442707200000, 9371],
          ];
          await visualBuilder.clickPanelOptions('timeSeries');
          await visualBuilder.setIntervalValue('2d');

          const chartDebugData = await visualBuilder.getChartDebugState();
          const title = await visualBuilder.getXAxisTitle(chartDebugData);
          const chartData = await visualBuilder.getAreaChartData(chartDebugData);

          expect(title).to.be('per 2 days');
          expect(chartData).to.eql(expectedChartData);
        });

        describe('Hiding series', () => {
          it('should hide series by legend item click', async () => {
            await visualBuilder.clickDataTab('timeSeries');
            await visualBuilder.setMetricsGroupByTerms('@tags.raw');

            let areasCount = (await visualBuilder.getChartItems())?.length;
            expect(areasCount).to.be(6);

            await visualBuilder.clickSeriesLegendItem('success');
            await visualBuilder.clickSeriesLegendItem('info');
            await visualBuilder.clickSeriesLegendItem('error');

            areasCount = (await visualBuilder.getChartItems())?.length;
            expect(areasCount).to.be(3);
          });

          it('should keep series hidden after refresh', async () => {
            await visualBuilder.clickDataTab('timeSeries');
            await visualBuilder.setMetricsGroupByTerms('extension.raw');

            let legendNames = await visualBuilder.getLegendNames();
            expect(legendNames).to.eql(['jpg', 'css', 'png', 'gif', 'php']);

            await visualBuilder.clickSeriesLegendItem('png');
            await visualBuilder.clickSeriesLegendItem('php');
            legendNames = await visualBuilder.getLegendNames();
            expect(legendNames).to.eql(['jpg', 'css', 'gif']);

            await visualize.clickRefresh(true);
            legendNames = await visualBuilder.getLegendNames();
            expect(legendNames).to.eql(['jpg', 'css', 'gif']);
          });
        });

        describe('Query filter', () => {
          it('should display correct chart data for applied series filter', async () => {
            const expectedChartData = [
              [1442620800000, 0],
              [1442664000000, 0],
              [1442707200000, 31],
              [1442750400000, 24],
              [1442793600000, 27],
              [1442836800000, 22],
              [1442880000000, 24],
            ];
            await visualBuilder.clickSeriesOption();
            await visualBuilder.setSeriesFilter('machine.os.raw : "win 7" and bytes > 10000');

            const chartData = await visualBuilder.getAreaChartData();
            expect(chartData).to.eql(expectedChartData);
          });

          it('should display correct chart data for applied panel filter', async () => {
            const expectedChartData = [
              [1442620800000, 0],
              [1442664000000, 0],
              [1442707200000, 472],
              [1442750400000, 474],
              [1442793600000, 450],
              [1442836800000, 439],
              [1442880000000, 458],
            ];
            await visualBuilder.clickPanelOptions('timeSeries');
            await visualBuilder.setPanelFilter('machine.os.raw: "ios"');

            const chartData = await visualBuilder.getAreaChartData();
            expect(chartData).to.eql(expectedChartData);
          });
        });

        describe('Annotations', () => {
          it('should display correct annotations amount with tooltip data for the selected annotation', async () => {
            await visualBuilder.clickAnnotationsTab();
            await visualBuilder.clickAnnotationsAddDataSourceButton();
            await visualBuilder.setAnnotationFilter('bytes = 0');
            await visualBuilder.setAnnotationFields('machine.os.raw, memory');
            await visualBuilder.setAnnotationRowTemplate(
              'OS: {{machine.os.raw}}, memory: {{memory}}'
            );

            const annotationsCount = await visualBuilder.getAnnotationsCount();
            await visualBuilder.clickAnnotationIcon(3);
            const annotationTooltipHeader = await visualBuilder.getAnnotationTooltipHeader();
            const annotationTooltipDetails = await visualBuilder.getAnnotationTooltipDetails();

            expect(annotationsCount).to.be(6);
            expect(annotationTooltipHeader).to.be('2015-09-21 06:00');
            expect(annotationTooltipDetails).to.be('OS: ios, memory: 0');
          });

          it('should display correct annotations amount with tooltip data for the selected annotation when using runtime field', async () => {
            await visualBuilder.clickAnnotationsTab();
            await visualBuilder.clickAnnotationsAddDataSourceButton();
            await visualBuilder.setAnnotationFilter('memory > 300000');
            await visualBuilder.setAnnotationFields('hello_world_runtime_field, geo.dest');
            await visualBuilder.setAnnotationRowTemplate(
              '{{hello_world_runtime_field}} from {{geo.dest}}!'
            );

            const annotationsCount = await visualBuilder.getAnnotationsCount();
            await visualBuilder.clickAnnotationIcon(5);
            const annotationTooltipHeader = await visualBuilder.getAnnotationTooltipHeader();
            const annotationTooltipDetails = await visualBuilder.getAnnotationTooltipDetails();

            expect(annotationsCount).to.be(30);
            expect(annotationTooltipHeader).to.be('2015-09-20 11:00');
            expect(annotationTooltipDetails).to.be('hello world from GA!');
          });
        });

        after(async () => await visualBuilder.toggleNewChartsLibraryWithDebug(false));
      });

      describe('index pattern selection mode', () => {
        it('should disable switch for Kibana index patterns mode by default', async () => {
          await visualBuilder.clickPanelOptions('timeSeries');
          const isEnabled = await visualBuilder.checkIndexPatternSelectionModeSwitchIsEnabled();
          expect(isEnabled).to.be(false);
        });

        describe('metrics:allowStringIndices = true', () => {
          before(async () => {
            await kibanaServer.uiSettings.update({ 'metrics:allowStringIndices': true });
            await browser.refresh();
          });

          beforeEach(async () => await visualBuilder.clickPanelOptions('timeSeries'));

          it('should not disable switch for Kibana index patterns mode', async () => {
            await visualBuilder.switchIndexPatternSelectionMode(true);

            const isEnabled = await visualBuilder.checkIndexPatternSelectionModeSwitchIsEnabled();
            expect(isEnabled).to.be(true);
          });

          it('should disable switch after selecting Kibana index patterns mode and metrics:allowStringIndices = false', async () => {
            await visualBuilder.switchIndexPatternSelectionMode(false);
            await kibanaServer.uiSettings.update({ 'metrics:allowStringIndices': false });
            await browser.refresh();
            await visualBuilder.clickPanelOptions('timeSeries');

            let isEnabled = await visualBuilder.checkIndexPatternSelectionModeSwitchIsEnabled();
            expect(isEnabled).to.be(true);

            await visualBuilder.switchIndexPatternSelectionMode(true);
            isEnabled = await visualBuilder.checkIndexPatternSelectionModeSwitchIsEnabled();
            expect(isEnabled).to.be(false);
          });

          after(
            async () =>
              await kibanaServer.uiSettings.update({ 'metrics:allowStringIndices': false })
          );
        });
      });
    });
  });
}
