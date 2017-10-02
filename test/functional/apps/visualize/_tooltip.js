import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const find = getService('find');
  const remote = getService('remote');
  const PageObjects = getPageObjects(['common', 'visualize', 'header', 'settings']);

  describe('tooltip', function describeIndexTests() {
    const embeddedVisName = 'embedded data table';
    before(async function () {

      //Create saved visualization for embedded tooltip
      log.debug('navigateToApp visualize');
      await PageObjects.common.navigateToUrl('visualize', 'new');
      log.debug('clickDataTable');
      await PageObjects.visualize.clickDataTable();
      log.debug('clickNewSearch');
      await PageObjects.visualize.clickNewSearch();
      log.debug('Bucket = Split Rows');
      await PageObjects.visualize.clickBucket('Split Rows');
      await PageObjects.visualize.selectAggregation('Terms');
      log.debug('Field = machine.os.raw');
      await PageObjects.visualize.selectField('machine.os.raw');
      await PageObjects.visualize.clickGo();
      await PageObjects.header.waitUntilLoadingHasFinished();
      log.debug('saving vis for embedding tests');
      await PageObjects.visualize.saveVisualization(embeddedVisName);

      const fromTime = '2015-09-20 00:30:00.000';
      const toTime = '2015-09-22 21:30:00.000';

      log.debug('navigateToApp visualize');
      await PageObjects.common.navigateToUrl('visualize', 'new');
      log.debug('clickVerticalBarChart');
      await PageObjects.visualize.clickVerticalBarChart();
      await PageObjects.visualize.clickNewSearch();
      log.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);
      log.debug('Bucket = X-Axis');
      await PageObjects.visualize.clickBucket('X-Axis');
      log.debug('Aggregation = Date Histogram');
      await PageObjects.visualize.selectAggregation('Date Histogram');
      log.debug('Field = @timestamp');
      await PageObjects.visualize.selectField('@timestamp');
      await PageObjects.visualize.clickGo();
      await PageObjects.header.waitUntilLoadingHasFinished();
    });

    describe('metric tooltip', async () => {
      it('should display only endzone tooltip when mouse over endzone', async () => {
        const endzone = await find.byCssSelector('g[class="endzone"]');
        await remote.moveMouseTo(endzone);
        await PageObjects.common.sleep(250); // give time for tooltip to open - its on debounce
        const tooltip = await find.byCssSelector('div[class="vis-tooltip"]');
        const tooltipContent = await tooltip.getVisibleText();
        const expected = [
          'This area may contain partial data.',
          'The selected time range does not fully cover it.'
        ];
        expect(tooltipContent.split('\n')).to.eql(expected);
      });

      it('should display endzone + metric tooltip when mouse over bar intersecting endzone', async () => {
        const bars = await find.allByCssSelector('rect[data-label="Count"]');
        await remote.moveMouseTo(bars[0]);
        await PageObjects.common.sleep(250); // give time for tooltip to open - its on debounce
        const tooltip = await find.byCssSelector('div[class="vis-tooltip"]');
        const tooltipContent = await tooltip.getVisibleText();
        const expected = [
          'Part of this bucket may contain partial data.',
          'The selected time range does not fully cover it.',
          'Count 5',
          '@timestamp per hour 2015-09-20 00:00'
        ];
        expect(tooltipContent.split('\n')).to.eql(expected);
      });

      it('should display only metric tooltip when mouse over bar not intersecting endzone', async () => {
        const bars = await find.allByCssSelector('rect[data-label="Count"]');
        await remote.moveMouseTo(bars[5]);
        await PageObjects.common.sleep(250); // give time for tooltip to open - its on debounce
        const tooltip = await find.byCssSelector('div[class="vis-tooltip"]');
        const tooltipContent = await tooltip.getVisibleText();
        const expected = [
          'Count 119',
          '@timestamp per hour 2015-09-20 05:00'
        ];
        expect(tooltipContent.split('\n')).to.eql(expected);
      });
    });

    describe('embedded vis tooltip', async () => {
      before(async function () {
        await PageObjects.visualize.clickVisEditorTab('options');
        await PageObjects.visualize.openTooltipSettings();
        await PageObjects.visualize.setTooltipType('visTooltipOption');
        await PageObjects.visualize.setReactSelect('.vis-react-select', embeddedVisName);
        await PageObjects.visualize.clickGo();
        await PageObjects.header.waitUntilLoadingHasFinished();
      });

      it('should display endzone + embedded vis tooltip when mouse over bar intersecting endzone', async () => {
        const bars = await find.allByCssSelector('rect[data-label="Count"]');
        await remote.moveMouseTo(bars[0]);
        await PageObjects.common.sleep(250); // give time for tooltip to open - its on debounce
        const tooltip = await find.byCssSelector('div[class="vis-tooltip"]');
        const tooltipContent = await tooltip.getVisibleText();
        const expected = [
          'Part of this bucket may contain partial data.',
          'The selected time range does not fully cover it.',
          'machine.os.raw: Descending Count',
          'ios',
          '2',
          'win 7',
          '1',
          'win 8',
          '1'
        ];
        expect(tooltipContent.split('\n').slice(0, 9)).to.eql(expected);
      });

      it('should display only embedded vis tooltip when mouse over bar not intersecting endzone', async () => {
        const bars = await find.allByCssSelector('rect[data-label="Count"]');
        await remote.moveMouseTo(bars[5]);
        await PageObjects.common.sleep(250); // give time for tooltip to open - its on debounce
        const tooltip = await find.byCssSelector('div[class="vis-tooltip"]');
        const tooltipContent = await tooltip.getVisibleText();
        const expected = [
          'machine.os.raw: Descending Count',
          'win 8',
          '27',
          'ios',
          '23',
          'win xp',
          '23',
          'win 7',
          '20',
          'osx',
          '15'
        ];
        expect(tooltipContent.split('\n').slice(0, 11)).to.eql(expected);
      });
    });
  });
}
