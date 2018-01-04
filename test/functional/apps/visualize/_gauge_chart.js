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

      it('should show Split Gauges', function () {
        const expectedTexts = [ 'win 8', 'win xp', 'win 7', 'ios' ];
        return PageObjects.visualize.clickMetricEditor()
          .then(function clickBucket() {
            log.debug('Bucket = Split Group');
            return PageObjects.visualize.clickBucket('Split Group');
          })
          .then(function selectAggregation() {
            log.debug('Aggregation = Terms');
            return PageObjects.visualize.selectAggregation('Terms');
          })
          .then(function selectField() {
            log.debug('Field = machine.os.raw');
            return PageObjects.visualize.selectField('machine.os.raw');
          })
          .then(function setSize() {
            log.debug('Size = 4');
            return PageObjects.visualize.setSize('4');
          })
          .then(function clickGo() {
            return PageObjects.visualize.clickGo();
          })
          .then(function () {
            return retry.try(function tryingForTime() {
              return PageObjects.visualize.getGaugeValue()
                .then(function (metricValue) {
                  expect(expectedTexts).to.eql(metricValue);
                });
            });
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

        return retry.try(function tryingForTime() {
          return PageObjects.visualize.getGaugeValue()
            .then(async function (metricValue) {
              expect(expectedTexts).to.eql(metricValue);
            });
        });
      });

    });
  });
}
