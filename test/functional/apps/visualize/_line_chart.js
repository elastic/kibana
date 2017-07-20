import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const retry = getService('retry');
  const screenshots = getService('screenshots');
  const PageObjects = getPageObjects(['common', 'visualize', 'header']);

  describe('visualize app', function describeIndexTests() {
    before(function () {
      const fromTime = '2015-09-19 06:31:44.000';
      const toTime = '2015-09-23 18:31:44.000';

      log.debug('navigateToApp visualize');
      return PageObjects.common.navigateToUrl('visualize', 'new')
      .then(function () {
        log.debug('clickLineChart');
        return PageObjects.visualize.clickLineChart();
      })
      .then(function clickNewSearch() {
        return PageObjects.visualize.clickNewSearch();
      })
      .then(function setAbsoluteRange() {
        log.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
        return PageObjects.header.setAbsoluteRange(fromTime, toTime);
      })
      .then(function clickBucket() {
        log.debug('Bucket = Split Chart');
        return PageObjects.visualize.clickBucket('Split Chart');
      })
      .then(function selectAggregation() {
        log.debug('Aggregation = Terms');
        return PageObjects.visualize.selectAggregation('Terms');
      })
      .then(function selectField() {
        log.debug('Field = extension');
        return PageObjects.visualize.selectField('extension.raw');
      })
      .then(function setInterval() {
        log.debug('switch from Rows to Columns');
        return PageObjects.visualize.clickColumns();
      })
      .then(function clickGo() {
        return PageObjects.visualize.clickGo();
      })
      .then(function () {
        return PageObjects.header.waitUntilLoadingHasFinished();
      });
    });

    describe('line charts', function indexPatternCreation() {
      const vizName1 = 'Visualization LineChart';

      it('should show correct chart, take screenshot', function () {

        // this test only verifies the numerical part of this data
        // it could also check the legend to verify the extensions
        const expectedChartData = ['jpg 9,109', 'css 2,159', 'png 1,373', 'gif 918', 'php 445'];

        // sleep a bit before trying to get the chart data
        return PageObjects.common.sleep(3000)
        .then(function () {
          return PageObjects.visualize.getLineChartData('fill="#6eadc1"')
          .then(function showData(data) {
            log.debug('data=' + data);
            screenshots.take('Visualize-line-chart');
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
      });


      it('should show correct chart order by Term', function () {

        // this test only verifies the numerical part of this data
        // https://github.com/elastic/kibana/issues/8141
        const expectedChartData = ['png 1,373', 'php 445', 'jpg 9,109', 'gif 918', 'css 2,159'];

        log.debug('Order By = Term');
        return PageObjects.visualize.selectOrderBy('_term')
        .then(function clickGo() {
          return PageObjects.visualize.clickGo();
        })
        .then(function () {
          return retry.try(function () {
            return PageObjects.visualize.getLineChartData('fill="#6eadc1"')
            .then(function showData(data) {
              log.debug('data=' + data);
              screenshots.take('Visualize-line-chart');
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
        });
      });


      it('should show correct data, ordered by Term', function () {

        const expectedChartData = ['png', '1,373', 'php', '445', 'jpg', '9,109', 'gif', '918', 'css', '2,159'];

        return PageObjects.visualize.collapseChart()
        .then(function getDataTableData() {
          return PageObjects.visualize.getDataTableData();
        })
        .then(function showData(data) {
          log.debug(data.split('\n'));
          expect(data.trim().split('\n')).to.eql(expectedChartData);
        });
      });


      it('should be able to save and load', function () {

        return PageObjects.visualize.saveVisualization(vizName1)
        .then(function (message) {
          log.debug('Saved viz message = ' + message);
          expect(message).to.be('Visualization Editor: Saved Visualization \"' + vizName1 + '\"');
        })
        .then(function testVisualizeWaitForToastMessageGone() {
          return PageObjects.visualize.waitForToastMessageGone();
        })
        .then(function () {
          return PageObjects.visualize.loadSavedVisualization(vizName1);
        })
        .then(function waitForVisualization() {
          return PageObjects.visualize.waitForVisualization();
        });
      });



    });
  });
}
