import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'visualize', 'header']);

  describe('line charts', function () {
    const vizName1 = 'Visualization LineChart';

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
      log.debug('Bucket = Split Chart');
      await PageObjects.visualize.clickBucket('Split Chart');
      log.debug('Aggregation = Terms');
      await PageObjects.visualize.selectAggregation('Terms');
      log.debug('Field = extension');
      await PageObjects.visualize.selectField('extension.raw');
      log.debug('switch from Rows to Columns');
      await PageObjects.visualize.clickColumns();
      await PageObjects.visualize.clickGo();
      await PageObjects.header.waitUntilLoadingHasFinished();
    });


    it('should show correct chart', async function () {
      // this test only verifies the numerical part of this data
      // it could also check the legend to verify the extensions
      const expectedChartData = ['jpg 9,109', 'css 2,159', 'png 1,373', 'gif 918', 'php 445'];

      // sleep a bit before trying to get the chart data
      await PageObjects.common.sleep(3000);
      const data = await PageObjects.visualize.getLineChartData();
      log.debug('data=' + data);
      const tolerance = 10; // the y-axis scale is 10000 so 10 is 0.1%
      for (let x = 0; x < data.length; x++) {
        log.debug('x=' + x + ' expectedChartData[x].split(\' \')[1] = ' +
          (expectedChartData[x].split(' ')[1]).replace(',', '') + '  data[x]=' + data[x] +
          ' diff=' + Math.abs(expectedChartData[x].split(' ')[1].replace(',', '') - data[x]));
        expect(Math.abs(expectedChartData[x].split(' ')[1].replace(',', '') - data[x]) < tolerance).to.be.ok();
      }
      log.debug('Done');
    });

    it('should display spy panel toggle button', async function () {
      const spyToggleExists = await PageObjects.visualize.getSpyToggleExists();
      expect(spyToggleExists).to.be(true);
    });


    it('should show correct chart order by Term', async function () {
      // this test only verifies the numerical part of this data
      // https://github.com/elastic/kibana/issues/8141
      const expectedChartData = ['png 1,373', 'php 445', 'jpg 9,109', 'gif 918', 'css 2,159'];

      log.debug('Order By = Term');
      await PageObjects.visualize.selectOrderBy('_term');
      await PageObjects.visualize.clickGo();
      await retry.try(async function () {
        const data = await PageObjects.visualize.getLineChartData();
        log.debug('data=' + data);
        const tolerance = 10; // the y-axis scale is 10000 so 10 is 0.1%
        for (let x = 0; x < data.length; x++) {
          log.debug('x=' + x + ' expectedChartData[x].split(\' \')[1] = ' +
            (expectedChartData[x].split(' ')[1]).replace(',', '') + '  data[x]=' + data[x] +
            ' diff=' + Math.abs(expectedChartData[x].split(' ')[1].replace(',', '') - data[x]));
          expect(Math.abs(expectedChartData[x].split(' ')[1].replace(',', '') - data[x]) < tolerance).to.be.ok();
        }
        log.debug('Done');
      });
    });

    it('should show correct data, ordered by Term', async function () {
      const expectedChartData = ['png', '1,373', 'php', '445', 'jpg', '9,109', 'gif', '918', 'css', '2,159'];

      await PageObjects.visualize.toggleSpyPanel();
      const data = await PageObjects.visualize.getDataTableData();
      log.debug(data.split('\n'));
      expect(data.trim().split('\n')).to.eql(expectedChartData);
    });

    it('should be able to save and load', async function () {
      await PageObjects.visualize.saveVisualization(vizName1);
      const pageTitle = await PageObjects.common.getBreadcrumbPageTitle();
      log.debug(`Save viz page title is ${pageTitle}`);
      expect(pageTitle).to.contain(vizName1);
      await PageObjects.header.waitForToastMessageGone();
      await PageObjects.visualize.loadSavedVisualization(vizName1);
      await PageObjects.visualize.waitForVisualization();
    });
  });
}
