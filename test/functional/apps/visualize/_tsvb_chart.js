import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const PageObjects = getPageObjects(['common', 'visualize', 'header', 'settings', 'visualBuilder']);

  describe('visualize app', function describeIndexTests() {
    before(function () {
      const fromTime = '2015-09-19 06:31:44.000';
      const toTime = '2015-09-22 18:31:44.000';

      log.debug('navigateToApp visualize');
      return PageObjects.common.navigateToUrl('visualize', 'new')
        .then(function () {
          log.debug('clickVisualBuilderChart');
          return PageObjects.visualize.clickVisualBuilder();
        })
        .then(function setAbsoluteRange() {
          log.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
          return PageObjects.header.setAbsoluteRange(fromTime, toTime);
        })
        .then(function () {
          return PageObjects.header.waitUntilLoadingHasFinished();
        })
        .then(function sleep() {
          return PageObjects.common.sleep(1003);
        })
        .then(function clickMetric() {
          return PageObjects.visualBuilder.clickMetric();
        });
    });


    describe('Visual Builder chart', function indexPatternCreation() {

      it('should show correct data', function () {
        const expectedMetricValue =  '156';

        return PageObjects.visualBuilder.getMetricValue()
          .then(function (value) {
            log.debug(`metric value: ${value}`);
            expect(value).to.eql(expectedMetricValue);
          });
      });
    });
  });
}

