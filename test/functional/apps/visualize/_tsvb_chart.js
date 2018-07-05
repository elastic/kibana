import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const PageObjects = getPageObjects(['common', 'visualize', 'header', 'settings', 'visualBuilder']);

  describe('visual builder', function () {

    describe('Time Series', function () {
      before(async () => {
        await PageObjects.visualBuilder.resetPage();
      });

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

    describe('Math Aggregation', () => {
      before(async () => {
        await PageObjects.visualBuilder.resetPage();
        await PageObjects.visualBuilder.clickMetric();
        await PageObjects.visualBuilder.createNewAgg();
        await PageObjects.visualBuilder.selectAggType('math', 1);
        await PageObjects.visualBuilder.fillInVariable();
        await PageObjects.visualBuilder.fillInExpression('params.test + 1');
      });

      it('should not display spy panel toggle button', async function () {
        const spyToggleExists = await PageObjects.visualize.getSpyToggleExists();
        expect(spyToggleExists).to.be(false);
      });

      it('should show correct data', async function () {
        const expectedMetricValue =  '157';
        const value = await PageObjects.visualBuilder.getMetricValue();
        log.debug(`metric value: ${JSON.stringify(value)}`);
        log.debug(`metric value: ${value}`);
        expect(value).to.eql(expectedMetricValue);
      });

    });

    describe('metric', () => {
      before(async () => {
        await PageObjects.visualBuilder.resetPage();
        await PageObjects.visualBuilder.clickMetric();
      });

      it('should not display spy panel toggle button', async function () {
        const spyToggleExists = await PageObjects.visualize.getSpyToggleExists();
        expect(spyToggleExists).to.be(false);
      });

      it('should show correct data', async function () {
        const expectedMetricValue =  '156';
        const value = await PageObjects.visualBuilder.getMetricValue();
        log.debug(`metric value: ${value}`);
        expect(value).to.eql(expectedMetricValue);
      });

    });

    // add a gauge test
    describe('gauge', () => {
      before(async () => {
        await PageObjects.visualBuilder.resetPage();
        await PageObjects.visualBuilder.clickGauge();
        log.debug('clicked on Gauge');
      });

      it('should verfiy gauge label and count display', async function () {
        const labelString = await PageObjects.visualBuilder.getGaugeLabel();
        expect(labelString).to.be('Count');
        const gaugeCount = await PageObjects.visualBuilder.getGaugeCount();
        expect(gaugeCount).to.be('156');
      });
    });

    // add a top N test
    describe('topN', () => {
      before(async () => {
        await PageObjects.visualBuilder.resetPage();
        await PageObjects.visualBuilder.clickTopN();
        log.debug('clicked on TopN');
      });

      it('should verfiy topN label and count display', async function () {
        const labelString = await PageObjects.visualBuilder.getTopNLabel();
        expect(labelString).to.be('Count');
        const gaugeCount = await PageObjects.visualBuilder.getTopNCount();
        expect(gaugeCount).to.be('156');
      });
    });



    describe('markdown', () => {

      before(async () => {
        await PageObjects.visualBuilder.resetPage();
        await PageObjects.visualBuilder.clickMarkdown();
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

      describe('allow time offsets', () => {
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
    // add a table sanity timestamp
    describe('table', () => {
      before(async () => {
        await PageObjects.visualBuilder.resetPage();
        await PageObjects.visualBuilder.clickTable();
        await PageObjects.header.setAbsoluteRange('2015-09-22 06:00:00.000', '2015-09-22 11:00:00.000');
        log.debug('clicked on Table');
      });

      it('should be able to set values for group by field and column name', async () => {
        await PageObjects.visualBuilder.selectGroupByField('machine.os.raw');
        await PageObjects.visualBuilder.setLabelValue('OS');
        log.debug('finished setting field and column name');
      });

      it('should be able verify that values are displayed in the table', async () => {
        const tableData = await PageObjects.visualBuilder.getViewTable();
        log.debug(`Values on ${tableData}`);
        const expectedData = 'OS Count\nwin 8 13\nwin xp 10\nwin 7 12\nios 5\nosx 3';
        expect(tableData).to.be(expectedData);
      });



    });


  });
}
