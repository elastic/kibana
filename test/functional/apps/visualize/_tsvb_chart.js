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
        })
        .then(function addSeries() {
          return PageObjects.visualBuilder.addSeries();
        })
        .then(function addMetric() {
          return PageObjects.visualBuilder.addMetric();
        })
        .then(function selectOverallAverage() {
          return PageObjects.visualBuilder.selectItem('.vis_editor__series:last-child ' +
          '.vis_editor__series-row .ui-sortable-item:last-child .vis_editor__row_item:last-child',
          'Overall Sum');
        })
        .then(function selectCountMetric() {
          return PageObjects.visualBuilder.selectItem('.vis_editor__series:last-child ' +
          '.vis_editor__series-row .ui-sortable-item:last-child .vis_editor__std_sibling-metric',
          'Count');
        })
        .then(function sleep() {
          return PageObjects.common.sleep(1003);
        });
    });



    describe('Visual Builder chart', function indexPatternCreation() {

      it('should not display spy panel toggle button', async function () {
        const spyToggleExists = await PageObjects.visualize.getSpyToggleExists();
        expect(spyToggleExists).to.be(false);
      });

      it('should show correct primary value', function () {
        const expectedMetricValue =  '156';

        return PageObjects.visualBuilder.getMetricValue()
          .then(function (value) {
            log.debug(`primary metric value: ${value}`);
            expect(value).to.eql(expectedMetricValue);
          });
      });

      it('should show correct secondary value', function () {
        const expectedMetricValue =  '13,830';

        return PageObjects.visualBuilder.getSecondaryMetricValue()
          .then(function (value) {
            log.debug(`secondary metric value: ${value}`);
            expect(value).to.eql(expectedMetricValue);
          });
      });

    });
  });
}
