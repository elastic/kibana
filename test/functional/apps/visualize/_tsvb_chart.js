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
        });
    });

    describe('Visual Builder Time Series', function () {

      it('should show the correct count in the legend', async function () {
        const actualCount = await PageObjects.visualBuilder.getRhythmChartLegendValue();
        expect(actualCount).to.be('156');
      });

      it('should show the correct count in the legend with 2h offset', async function () {
        await PageObjects.visualBuilder.clickSeriesOption();
        await PageObjects.visualBuilder.enterOffsetSeries('2h');
        const actualCount = await PageObjects.visualBuilder.getRhythmChartLegendValue();
        expect(actualCount).to.be('293');
      });

      it('should show the correct count in the legend with -2h offset', async function () {
        await PageObjects.visualBuilder.enterOffsetSeries('-2h');
        const actualCount = await PageObjects.visualBuilder.getRhythmChartLegendValue();
        expect(actualCount).to.be('53');
      });

      after(async () => {
        // set back to no offset for the next test, an empty string didn't seem to work here
        await PageObjects.visualBuilder.enterOffsetSeries('0h');
      });

    });

    describe('Visual Builder metric', () => {
      before(async () => {
        await PageObjects.visualBuilder.clickMetric();
        await PageObjects.common.sleep(1003);
      });

      it('should not display spy panel toggle button', async function () {
        const spyToggleExists = await PageObjects.visualize.getSpyToggleExists();
        expect(spyToggleExists).to.be(false);
      });

      it('should show correct data', async function () {
        const expectedMetricValue =  '156';

        return PageObjects.visualBuilder.getMetricValue()
          .then(function (value) {
            log.debug(`metric value: ${value}`);
            expect(value).to.eql(expectedMetricValue);
          });
      });
    });

    describe('Visual Builder markdown', () => {

      before(async () => {
        await PageObjects.visualBuilder.clickMarkdown();
        await PageObjects.common.sleep(1003);
        await PageObjects.header.setAbsoluteRange('2015-09-22 06:00:00.000', '2015-09-22 11:00:00.000');
      });

      it('should allow printing raw timestamp of data', async () => {
        await PageObjects.visualBuilder.enterMarkdown('{{ count.data.raw.[0].[0] }}');
        const text = await PageObjects.visualBuilder.getMarkdownText();
        expect(text).to.be('1442901600000');
      });

      it.skip('should allow printing raw value of data', async () => {
        await PageObjects.visualBuilder.enterMarkdown('{{ count.data.raw.[0].[1] }}');
        const text = await PageObjects.visualBuilder.getMarkdownText();
        expect(text).to.be('6');
      });

      describe.skip('allow time offsets', () => {
        before(async () => {
          await PageObjects.visualBuilder.enterMarkdown('{{ count.data.raw.[0].[0] }}#{{ count.data.raw.[0].[1] }}');
          await PageObjects.visualBuilder.clickMarkdownData();
          await PageObjects.visualBuilder.clickSeriesOption();
        });

        it('allow positive time offsets', async () => {
          await PageObjects.visualBuilder.enterOffsetSeries('2h');
          const text = await PageObjects.visualBuilder.getMarkdownText();
          const [timestamp, value] = text.split('#');
          expect(timestamp).to.be('1442901600000');
          expect(value).to.be('3');
        });

        it('allow negative time offsets', async () => {
          await PageObjects.visualBuilder.enterOffsetSeries('-2h');
          const text = await PageObjects.visualBuilder.getMarkdownText();
          const [timestamp, value] = text.split('#');
          expect(timestamp).to.be('1442901600000');
          expect(value).to.be('23');
        });
      });

    });
  });
}
