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
  const { timePicker, visChart, visEditor, visualize } = getPageObjects([
    'timePicker',
    'visChart',
    'visEditor',
    'visualize',
  ]);
  const monacoEditor = getService('monacoEditor');
  const kibanaServer = getService('kibanaServer');
  const elasticChart = getService('elasticChart');
  const find = getService('find');

  describe('Timelion visualization', () => {
    before(async () => {
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
      await visEditor.clickGo();
    };

    it('should display correct data for specified index pattern and timefield', async () => {
      await initVisualization('.es(index=long-window-logstash-*,timefield=@timestamp)');

      const chartData = await visChart.getAreaChartData('q:* > count');
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

      const firstAreaChartData = await visChart.getAreaChartData('q:* > avg(bytes)');
      const secondAreaChartData = await visChart.getAreaChartData('q:* > min(bytes)');
      const thirdAreaChartData = await visChart.getAreaChartData('q:* > max(bytes)');
      const forthAreaChartData = await visChart.getAreaChartData('q:* > cardinality(bytes)');

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

      const firstAreaChartData = await visChart.getAreaChartData('initial');
      const secondAreaChartData = await visChart.getAreaChartData('add multiply abs divide');
      const thirdAreaChartData = await visChart.getAreaChartData('query derivative min sum');
      const forthAreaChartData = await visChart.getAreaChartData('condition');

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

      const leftAxesCount = await visChart.getAxesCountByPosition('left');
      const rightAxesCount = await visChart.getAxesCountByPosition('right');
      const firstAxesLabels = await visChart.getYAxisLabels();
      const secondAxesLabels = await visChart.getYAxisLabels(1);
      const thirdAxesLabels = await visChart.getYAxisLabels(2);
      const firstAreaChartData = await visChart.getAreaChartData('Average Machine RAM amount');
      const secondAreaChartData = await visChart.getAreaChartData(
        'Average Bytes for request',
        undefined,
        true
      );
      const thirdAreaChartData = await visChart.getAreaChartData(
        'Average Bytes for request with offset',
        undefined,
        true
      );

      expect(leftAxesCount).to.be(1);
      expect(rightAxesCount).to.be(2);
      expect(firstAreaChartData).to.eql(firstAreaExpectedChartData);
      expect(secondAreaChartData).to.eql(secondAreaExpectedChartData);
      expect(thirdAreaChartData).to.eql(thirdAreaExpectedChartData);
      expect(firstAxesLabels).to.eql(['12.19GB', '12.2GB', '12.21GB']);
      expect(secondAxesLabels).to.eql(['5.59KB', '5.6KB']);
      expect(thirdAxesLabels.toString()).to.be(
        'BYTES_5721,BYTES_5722,BYTES_5723,BYTES_5724,BYTES_5725,BYTES_5726,BYTES_5727,BYTES_5728,BYTES_5729,BYTES_5730,BYTES_5731,BYTES_5732,BYTES_5733'
      );
    });

    it('should display correct chart data for split expression', async () => {
      await initVisualization('.es(index=logstash-*, split=geo.dest:3)', '1 day');

      const firstAreaChartData = await visChart.getAreaChartData('q:* > geo.dest:CN > count');
      const secondAreaChartData = await visChart.getAreaChartData('q:* > geo.dest:IN > count');
      const thirdAreaChartData = await visChart.getAreaChartData('q:* > geo.dest:US > count');

      expect(firstAreaChartData).to.eql([0, 905, 910, 850, 0]);
      expect(secondAreaChartData).to.eql([0, 763, 699, 825, 0]);
      expect(thirdAreaChartData).to.eql([0, 423, 386, 389, 0]);
    });

    it('should display two areas and one bar chart items', async () => {
      await initVisualization('.es(*), .es(*), .es(*).bars(stack=true)');

      const areasChartsCount = await visChart.getAreaSeriesCount();
      const barsChartsCount = await visChart.getHistogramSeriesCount();

      expect(areasChartsCount).to.be(2);
      expect(barsChartsCount).to.be(1);
    });

    describe('Legend', () => {
      it('should correctly display the legend items names and position', async () => {
        await initVisualization('.es(*).label("first series"), .es(*).label("second series")');

        const legendNames = await visChart.getLegendEntries();
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

    after(
      async () =>
        await kibanaServer.uiSettings.update({
          'timelion:legacyChartsLibrary': true,
        })
    );
  });
}
