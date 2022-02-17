/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { timePicker, visChart, visEditor, visualize, timelion, common } = getPageObjects([
    'timePicker',
    'visChart',
    'visEditor',
    'visualize',
    'timelion',
    'common',
  ]);
  const security = getService('security');
  const monacoEditor = getService('monacoEditor');
  const kibanaServer = getService('kibanaServer');
  const elasticChart = getService('elasticChart');
  const find = getService('find');
  const retry = getService('retry');
  const timelionChartSelector = 'timelionChart';

  describe('Timelion visualization', () => {
    before(async () => {
      await security.testUser.setRoles([
        'kibana_admin',
        'long_window_logstash',
        'test_logstash_reader',
      ]);
      await kibanaServer.uiSettings.update({
        'timelion:legacyChartsLibrary': false,
      });
      await visualize.initTests(true);
      await visualize.navigateToNewAggBasedVisualization();
      await visualize.clickTimelion();
      await timePicker.setDefaultAbsoluteRange();
    });

    const initVisualization = async (expression: string, interval: string = '12h') => {
      await visEditor.setTimelionInterval(interval);
      await monacoEditor.setCodeEditorValue(expression);
      await visEditor.clickGo(true);
    };

    it('should display correct data for specified index pattern and timefield', async () => {
      await initVisualization('.es(index=long-window-logstash-*,timefield=@timestamp)');

      const chartData = await visChart.getAreaChartData('q:* > count', timelionChartSelector);
      expect(chartData).to.eql([3, 5, 2, 6, 1, 6, 1, 7, 0, 0]);
    });

    it('should display correct chart colors for multiple expressions', async () => {
      const expectedColors = ['#01A4A4', '#FFCFDF', '#BFA7DA', '#AD7DE6'];
      await initVisualization(
        '.es(*), .es(*).color("#FFCFDF"), .es(*).color("#BFA7DA"), .es(*).color("#AD7DE6")'
      );

      const areas = (await elasticChart.getChartDebugData())?.areas;
      expect(areas?.map(({ color }) => color)).to.eql(expectedColors);
    });

    it('should display correct chart data for average, min, max and cardinality aggregations', async () => {
      await initVisualization(
        '.es(index=logstash-*,metric=avg:bytes), .es(index=logstash-*,metric=min:bytes),' +
          '.es(index=logstash-*,metric=max:bytes,), .es(index=logstash-*,metric=cardinality:bytes)',
        '36h'
      );

      const firstAreaChartData = await visChart.getAreaChartData(
        'q:* > avg(bytes)',
        timelionChartSelector
      );
      const secondAreaChartData = await visChart.getAreaChartData(
        'q:* > min(bytes)',
        timelionChartSelector
      );
      const thirdAreaChartData = await visChart.getAreaChartData(
        'q:* > max(bytes)',
        timelionChartSelector
      );
      const forthAreaChartData = await visChart.getAreaChartData(
        'q:* > cardinality(bytes)',
        timelionChartSelector
      );

      expect(firstAreaChartData).to.eql([5732.783676366217, 5721.775973559419]);
      expect(secondAreaChartData).to.eql([0, 0]);
      expect(thirdAreaChartData).to.eql([19985, 19986]);
      expect(forthAreaChartData).to.eql([5019, 4958, 0, 0]);
    });

    it('should display correct chart data for expressions using functions', async () => {
      const firstAreaExpectedChartData = [3, 2421, 2343, 2294, 2327, 2328, 2312, 7, 0, 0];
      const thirdAreaExpectedChartData = [200, 167, 199, 200, 200, 198, 108, 200, 200];
      const forthAreaExpectedChartData = [150, 50, 50, 50, 50, 50, 50, 150, 150, 150];
      await initVisualization(
        '.es(*).label("initial"),' +
          '.es(*).add(term=.es(*).multiply(-1).abs()).divide(2).label("add multiply abs divide"),' +
          '.es(q="bytes<100").derivative().sum(200).min(200).label("query derivative min sum"),' +
          '.es(*).if(operator=gt,if=200,then=50,else=150).label("condition")'
      );

      const firstAreaChartData = await visChart.getAreaChartData('initial', timelionChartSelector);
      const secondAreaChartData = await visChart.getAreaChartData(
        'add multiply abs divide',
        timelionChartSelector
      );
      const thirdAreaChartData = await visChart.getAreaChartData(
        'query derivative min sum',
        timelionChartSelector
      );
      const forthAreaChartData = await visChart.getAreaChartData(
        'condition',
        timelionChartSelector
      );

      expect(firstAreaChartData).to.eql(firstAreaExpectedChartData);
      expect(secondAreaChartData).to.eql(firstAreaExpectedChartData);
      expect(thirdAreaChartData).to.eql(thirdAreaExpectedChartData);
      expect(forthAreaChartData).to.eql(forthAreaExpectedChartData);
    });

    it('should display correct chart title, data and labels for expressions with custom labels, yaxis and offset', async () => {
      const firstAreaExpectedChartData = [13112352443.375292, 13095637741.055172];
      const secondAreaExpectedChartData = [
        [1442642400000, 5732.783676366217],
        [1442772000000, 5721.775973559419],
      ];
      const thirdAreaExpectedChartData = [
        [1442772000000, 5732.783676366217],
        [1442901600000, 5721.775973559419],
      ];
      await initVisualization(
        '.es(index=logstash*,timefield="@timestamp",metric=avg:machine.ram).label("Average Machine RAM amount").yaxis(2,units=bytes,position=right),' +
          '.es(index=logstash*,timefield="@timestamp",metric=avg:bytes).label("Average Bytes for request").yaxis(1,units=bytes,position=left),' +
          '.es(index=logstash*,timefield="@timestamp",metric=avg:bytes, offset=-12h).label("Average Bytes for request with offset").yaxis(3,units=custom:BYTES_,position=right)',
        '36h'
      );

      const leftAxesCount = await visChart.getAxesCountByPosition('left', timelionChartSelector);
      const rightAxesCount = await visChart.getAxesCountByPosition('right', timelionChartSelector);
      const firstAxesLabels = await visChart.getYAxisLabels(timelionChartSelector);
      const secondAxesLabels = await visChart.getYAxisLabels(timelionChartSelector, 1);
      const thirdAxesLabels = await visChart.getYAxisLabels(timelionChartSelector, 2);
      const firstAreaChartData = await visChart.getAreaChartData(
        'Average Machine RAM amount',
        timelionChartSelector
      );
      const secondAreaChartData = await visChart.getAreaChartData(
        'Average Bytes for request',
        timelionChartSelector,
        true
      );
      const thirdAreaChartData = await visChart.getAreaChartData(
        'Average Bytes for request with offset',
        timelionChartSelector,
        true
      );

      expect(leftAxesCount).to.be(1);
      expect(rightAxesCount).to.be(2);
      expect(firstAreaChartData).to.eql(firstAreaExpectedChartData);
      expect(secondAreaChartData).to.eql(secondAreaExpectedChartData);
      expect(thirdAreaChartData).to.eql(thirdAreaExpectedChartData);
      expect(firstAxesLabels).to.eql(['12.2GB', '12.21GB']);
      expect(secondAxesLabels).to.eql(['5.59KB', '5.6KB']);
      expect(thirdAxesLabels.toString()).to.be(
        'BYTES_5722,BYTES_5723,BYTES_5724,BYTES_5725,BYTES_5726,BYTES_5727,BYTES_5728,BYTES_5729,BYTES_5730,BYTES_5731,BYTES_5732,BYTES_5733'
      );
    });

    it('should display correct chart data for split expression', async () => {
      await initVisualization('.es(index=logstash-*, split=geo.dest:3)', '1 day');

      const firstAreaChartData = await visChart.getAreaChartData(
        'q:* > geo.dest:CN > count',
        timelionChartSelector
      );
      const secondAreaChartData = await visChart.getAreaChartData(
        'q:* > geo.dest:IN > count',
        timelionChartSelector
      );
      const thirdAreaChartData = await visChart.getAreaChartData(
        'q:* > geo.dest:US > count',
        timelionChartSelector
      );

      expect(firstAreaChartData).to.eql([0, 905, 910, 850, 0]);
      expect(secondAreaChartData).to.eql([0, 763, 699, 825, 0]);
      expect(thirdAreaChartData).to.eql([0, 423, 386, 389, 0]);
    });

    it('should display two areas and one bar chart items', async () => {
      await initVisualization('.es(*), .es(*), .es(*).bars(stack=true)');

      const areasChartsCount = await visChart.getAreaSeriesCount(timelionChartSelector);
      const barsChartsCount = await visChart.getHistogramSeriesCount(timelionChartSelector);

      expect(areasChartsCount).to.be(2);
      expect(barsChartsCount).to.be(1);
    });

    describe('Legend', () => {
      it('should correctly display the legend items names and position', async () => {
        await initVisualization('.es(*).label("first series"), .es(*).label("second series")');

        const legendNames = await visChart.getLegendEntriesXYCharts(timelionChartSelector);
        const legendElement = await find.byClassName('echLegend');
        const isLegendTopPositioned = await legendElement.elementHasClass('echLegend--top');
        const isLegendLeftPositioned = await legendElement.elementHasClass('echLegend--left');

        expect(legendNames).to.eql(['first series', 'second series']);
        expect(isLegendTopPositioned).to.be(true);
        expect(isLegendLeftPositioned).to.be(true);
      });

      it('should correctly display the legend position', async () => {
        await initVisualization('.es(*).legend(position=se)');

        const legendElement = await find.byClassName('echLegend');
        const isLegendBottomPositioned = await legendElement.elementHasClass('echLegend--bottom');
        const isLegendRightPositioned = await legendElement.elementHasClass('echLegend--right');

        expect(isLegendBottomPositioned).to.be(true);
        expect(isLegendRightPositioned).to.be(true);
      });

      it('should not display the legend', async () => {
        await initVisualization('.es(*), .es(*).label("second series").legend(position=false)');

        const isLegendElementExists = await find.existsByCssSelector('.echLegend');
        expect(isLegendElementExists).to.be(false);
      });
    });

    describe('expression typeahead', () => {
      it('should display function suggestions', async () => {
        await monacoEditor.setCodeEditorValue('');
        await monacoEditor.typeCodeEditorValue('.e', 'timelionCodeEditor');
        // wait for monaco editor model will be updated with new value
        await common.sleep(300);
        let value = await monacoEditor.getCodeEditorValue(0);
        expect(value).to.eql('.e');
        const suggestions = await timelion.getSuggestionItemsText();
        expect(suggestions.length).to.eql(2);
        expect(suggestions[0].includes('es')).to.eql(true);
        expect(suggestions[1].includes('elasticsearch')).to.eql(true);
        await timelion.clickSuggestion(0);
        // wait for monaco editor model will be updated with new value
        await common.sleep(300);
        value = await monacoEditor.getCodeEditorValue(0);
        expect(value).to.eql('.es()');
      });

      describe('dynamic suggestions for argument values', () => {
        describe('.es()', () => {
          it('should show index pattern suggestions for index argument', async () => {
            await monacoEditor.setCodeEditorValue('');
            await monacoEditor.typeCodeEditorValue('.es(index=', 'timelionCodeEditor');
            // wait for index patterns will be loaded
            await common.sleep(500);
            // other suggestions might be shown for a short amount of time - retry until metric suggestions show up
            await retry.try(async () => {
              const suggestions = await timelion.getSuggestionItemsText();
              expect(suggestions[0].includes('log')).to.eql(true);
            });
          });

          it('should show field suggestions for timefield argument when index pattern set', async () => {
            await monacoEditor.setCodeEditorValue('');
            await monacoEditor.typeCodeEditorValue(
              '.es(index=logstash-*, timefield=',
              'timelionCodeEditor'
            );
            // other suggestions might be shown for a short amount of time - retry until metric suggestions show up
            await retry.try(async () => {
              const suggestions = await timelion.getSuggestionItemsText();
              expect(suggestions.length).to.eql(4);
              expect(suggestions[0].includes('@timestamp')).to.eql(true);
            });
          });

          it('should show field suggestions for split argument when index pattern set', async () => {
            await monacoEditor.setCodeEditorValue('');
            await monacoEditor.typeCodeEditorValue(
              '.es(index=logstash-*, timefield=@timestamp, split=',
              'timelionCodeEditor'
            );
            // wait for split fields to load
            await common.sleep(300);
            // other suggestions might be shown for a short amount of time - retry until metric suggestions show up
            await retry.try(async () => {
              const suggestions = await timelion.getSuggestionItemsText();

              expect(suggestions[0].includes('@message.raw')).to.eql(true);
            });
          });

          it('should show field suggestions for metric argument when index pattern set', async () => {
            await monacoEditor.typeCodeEditorValue(
              '.es(index=logstash-*, timefield=@timestamp, metric=avg:',
              'timelionCodeEditor'
            );
            // other suggestions might be shown for a short amount of time - retry until metric suggestions show up
            await retry.try(async () => {
              const suggestions = await timelion.getSuggestionItemsText();
              expect(suggestions[0].includes('avg:bytes')).to.eql(true);
            });
          });
        });
      });
    });

    after(
      async () =>
        await kibanaServer.uiSettings.update({
          'timelion:legacyChartsLibrary': true,
        })
    );
  });
}
