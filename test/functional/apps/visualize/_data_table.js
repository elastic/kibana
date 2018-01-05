import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'visualize', 'header']);

  describe('visualize app', function describeIndexTests() {
    const fromTime = '2015-09-19 06:31:44.000';
    const toTime = '2015-09-23 18:31:44.000';

    before(function () {
      log.debug('navigateToApp visualize');
      return PageObjects.common.navigateToUrl('visualize', 'new')
        .then(function () {
          log.debug('clickDataTable');
          return PageObjects.visualize.clickDataTable();
        })
        .then(function clickNewSearch() {
          log.debug('clickNewSearch');
          return PageObjects.visualize.clickNewSearch();
        })
        .then(function setAbsoluteRange() {
          log.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
          return PageObjects.header.setAbsoluteRange(fromTime, toTime);
        })
        .then(function clickBucket() {
          log.debug('Bucket = Split Rows');
          return PageObjects.visualize.clickBucket('Split Rows');
        })
        .then(function selectAggregation() {
          log.debug('Aggregation = Histogram');
          return PageObjects.visualize.selectAggregation('Histogram');
        })
        .then(function selectField() {
          log.debug('Field = bytes');
          return PageObjects.visualize.selectField('bytes');
        })
        .then(function setInterval() {
          log.debug('Interval = 2000');
          return PageObjects.visualize.setNumericInterval('2000');
        })
        .then(function clickGo() {
          return PageObjects.visualize.clickGo();
        })
        .then(function () {
          return PageObjects.header.waitUntilLoadingHasFinished();
        });
    });

    describe('data table', function indexPatternCreation() {
      const vizName1 = 'Visualization DataTable';

      it('should be able to save and load', function () {
        return PageObjects.visualize.saveVisualization(vizName1)
          .then(() => {
            return PageObjects.common.getBreadcrumbPageTitle();
          })
          .then(pageTitle => {
            log.debug(`Save viz page title is ${pageTitle}`);
            expect(pageTitle).to.contain(vizName1);
          })
          .then(function testVisualizeWaitForToastMessageGone() {
            return PageObjects.header.waitForToastMessageGone();
          })
          .then(function () {
            return PageObjects.visualize.loadSavedVisualization(vizName1);
          })
          .then(function () {
            return PageObjects.visualize.waitForVisualization();
          });
      });

      it('should display spy panel toggle button', async function () {
        const spyToggleExists = await PageObjects.visualize.getSpyToggleExists();
        expect(spyToggleExists).to.be(true);
      });

      it('should show correct data, take screenshot', function () {
        const expectedChartData = [
          '0B', '2,088', '1.953KB', '2,748', '3.906KB', '2,707', '5.859KB', '2,876', '7.813KB',
          '2,863', '9.766KB', '147', '11.719KB', '148', '13.672KB', '129', '15.625KB', '161', '17.578KB', '137'
        ];

        return retry.try(function () {
          return PageObjects.visualize.getDataTableData()
            .then(function showData(data) {
              log.debug(data.split('\n'));
              expect(data.split('\n')).to.eql(expectedChartData);
            });
        });
      });

    });
  });
}
