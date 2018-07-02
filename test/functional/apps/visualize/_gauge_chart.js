import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'visualize', 'header']);

  describe('gauge chart', function () {
    const fromTime = '2015-09-19 06:31:44.000';
    const toTime = '2015-09-23 18:31:44.000';

    before(async function () {
      log.debug('navigateToApp visualize');
      await PageObjects.common.navigateToUrl('visualize', 'new');
      log.debug('clickGauge');
      await PageObjects.visualize.clickGauge();
      await PageObjects.visualize.clickNewSearch();
      log.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);
    });


    it('should display spy panel toggle button', async function () {
      const spyToggleExists = await PageObjects.visualize.getSpyToggleExists();
      expect(spyToggleExists).to.be(true);
    });

    it('should show Count', function () {
      const expectedCount = ['14,004', 'Count'];

      // initial metric of "Count" is selected by default
      return retry.try(async function tryingForTime() {
        const metricValue = await PageObjects.visualize.getGaugeValue();
        expect(expectedCount).to.eql(metricValue[0].split('\n'));
      });
    });

    it('should show Split Gauges', async function () {
      const expectedTexts = [ 'win 8', 'win xp', 'win 7', 'ios' ];
      await PageObjects.visualize.clickMetricEditor();
      log.debug('Bucket = Split Group');
      await PageObjects.visualize.clickBucket('Split Group');
      log.debug('Aggregation = Terms');
      await PageObjects.visualize.selectAggregation('Terms');
      log.debug('Field = machine.os.raw');
      await PageObjects.visualize.selectField('machine.os.raw');
      log.debug('Size = 4');
      await PageObjects.visualize.setSize('4');
      await PageObjects.visualize.clickGo();
      await retry.try(async function tryingForTime() {
        const metricValue = await PageObjects.visualize.getGaugeValue();
        expect(expectedTexts).to.eql(metricValue);
      });
    });

    it('should show correct values for fields with fieldFormatters', async function () {
      const expectedTexts = [ '2,904\nwin 8: Count', '0B\nwin 8: Min bytes' ];

      await PageObjects.visualize.clickMetricEditor();
      await PageObjects.visualize.clickBucket('Split Group');
      await PageObjects.visualize.selectAggregation('Terms');
      await PageObjects.visualize.selectField('machine.os.raw');
      await PageObjects.visualize.setSize('1');
      await PageObjects.visualize.clickAddMetric();
      await PageObjects.visualize.clickBucket('Metric');
      await PageObjects.visualize.selectAggregation('Min', 'metrics');
      await PageObjects.visualize.selectField('bytes', 'metrics');
      await PageObjects.visualize.clickGo();

      await retry.try(async function tryingForTime() {
        const metricValue = await PageObjects.visualize.getGaugeValue();
        expect(expectedTexts).to.eql(metricValue);
      });
    });

  });
}
