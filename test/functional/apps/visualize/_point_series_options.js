import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'visualize', 'header', 'pointSeries']);
  const pointSeriesVis = PageObjects.pointSeries;

  describe('point series', function () {
    before(async function () {
      const fromTime = '2015-09-19 06:31:44.000';
      const toTime = '2015-09-23 18:31:44.000';

      log.debug('navigateToApp visualize');
      await PageObjects.common.navigateToUrl('visualize', 'new');
      log.debug('clickLineChart');
      await PageObjects.visualize.clickLineChart();
      await PageObjects.visualize.clickNewSearch();
      log.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);
      log.debug('Bucket = X-Axis');
      await PageObjects.visualize.clickBucket('X-Axis');
      log.debug('Aggregation = Date Histogram');
      await PageObjects.visualize.selectAggregation('Date Histogram');
      log.debug('Field = @timestamp');
      await PageObjects.visualize.selectField('@timestamp');
      // add another metrics
      log.debug('Add Metric');
      await PageObjects.visualize.clickAddMetric();
      log.debug('Metric = Value Axis');
      await PageObjects.visualize.clickBucket('Y-Axis');
      log.debug('Aggregation = Average');
      await PageObjects.visualize.selectAggregation('Average', 'metrics');
      log.debug('Field = memory');
      await PageObjects.visualize.selectField('machine.ram', 'metrics');
      // go to options page
      log.debug('Going to axis options');
      await pointSeriesVis.clickAxisOptions();
      // add another value axis
      log.debug('adding axis');
      await pointSeriesVis.clickAddAxis();
      // set average count to use second value axis
      await pointSeriesVis.toggleCollapsibleTitle('Average machine.ram');
      log.debug('Average memory value axis - ValueAxis-2');
      await pointSeriesVis.setSeriesAxis(1, 'ValueAxis-2');
      await PageObjects.visualize.clickGo();
      await PageObjects.header.awaitGlobalLoadingIndicatorHidden();
    });

    describe('secondary value axis', function () {

      it('should show correct chart', async function () {
        const expectedChartValues = [
          [ 37, 202, 740, 1437, 1371, 751, 188, 31, 42, 202, 683,
            1361, 1415, 707, 177, 27, 32, 175, 707, 1408, 1355, 726, 201, 29 ],
          [ 14018300000, 13284800000, 13198800000, 13093400000, 13067800000,
            12976600000, 13561800000, 14339600000, 14011000000, 12775300000,
            13304500000, 12988900000, 13143500000, 13244400000, 12154800000,
            15907300000, 13757300000, 13022200000, 12807300000, 13375700000,
            13190800000, 12627500000, 12731500000, 13153300000 ],
        ];

        await retry.try(async () => {
          const data = await PageObjects.visualize.getLineChartData('Count');
          log.debug('count data=' + data);
          log.debug('data.length=' + data.length);
          expect(data).to.eql(expectedChartValues[0]);
        });

        await retry.try(async () => {
          const avgMemoryData = await PageObjects.visualize.getLineChartData('Average machine.ram', 'ValueAxis-2');
          log.debug('average memory data=' + avgMemoryData);
          log.debug('data.length=' + avgMemoryData.length);
          expect(avgMemoryData).to.eql(expectedChartValues[1]);
        });
      });

      it('should put secondary axis on the right', async function () {
        const length = await pointSeriesVis.getRightValueAxes();
        expect(length).to.be(1);
      });
    });

    describe('multiple chart types', function () {
      it('should change average series type to histogram', async function () {
        await pointSeriesVis.toggleCollapsibleTitle('RightAxis-1');
        await pointSeriesVis.setSeriesType(1, 'bar');
        await PageObjects.visualize.clickGo();
        const length = await pointSeriesVis.getHistogramSeries();
        expect(length).to.be(1);
      });
    });

    describe('grid lines', function () {
      before(async function () {
        await pointSeriesVis.clickOptions();
      });

      it('should show category grid lines', async function () {
        await pointSeriesVis.toggleGridCategoryLines();
        await PageObjects.visualize.clickGo();
        const gridLines = await pointSeriesVis.getGridLines();
        expect(gridLines.length).to.be(9);
        gridLines.forEach(gridLine => {
          expect(gridLine.y).to.be(0);
        });
      });

      it('should show value axis grid lines', async function () {
        await pointSeriesVis.setGridValueAxis('ValueAxis-2');
        await pointSeriesVis.toggleGridCategoryLines();
        await PageObjects.visualize.clickGo();
        const gridLines = await pointSeriesVis.getGridLines();
        expect(gridLines.length).to.be(9);
        gridLines.forEach(gridLine => {
          expect(gridLine.x).to.be(0);
        });
      });
    });

  });
}
