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
          log.debug('clickGauge');
          return PageObjects.visualize.clickGauge();
        })
        .then(function clickNewSearch() {
          return PageObjects.visualize.clickNewSearch();
        })
        .then(function setAbsoluteRange() {
          log.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
          return PageObjects.header.setAbsoluteRange(fromTime, toTime);
        });
    });

    describe('gauge chart', function indexPatternCreation() {

      it('should display spy panel toggle button', async function () {
        const spyToggleExists = await PageObjects.visualize.getSpyToggleExists();
        expect(spyToggleExists).to.be(true);
      });

      it('should show Count', function () {
        const expectedCount = ['14,004', 'Count'];

        // initial metric of "Count" is selected by default
        return retry.try(function tryingForTime() {
          return PageObjects.visualize.getGaugeValue()
            .then(function (metricValue) {
              expect(expectedCount).to.eql(metricValue[0].split('\n'));
            });
        });
      });

    });
  });
}
