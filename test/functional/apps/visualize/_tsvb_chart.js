import expect from 'expect.js';

export default ({ getService, getPageObjects }) => {
  const log = getService('log');
  const PageObjects = getPageObjects([
    'common',
    'visualize',
    'header',
    'settings',
    'visualBuilder',
  ]);

  describe('visual builder', function describeIndexTests() {
    before(() => {
      const fromTime = '2015-09-19 06:31:44.000';
      const toTime = '2015-09-22 18:31:44.000';

      log.debug('navigateToApp visualize');
      return PageObjects.common
        .navigateToUrl('visualize', 'new')
        .then(() => {
          log.debug('clickVisualBuilderChart');
          return PageObjects.visualize.clickVisualBuilder();
        })
        .then(function setAbsoluteRange() {
          log.debug(
            'Set absolute time range from "' +
              fromTime +
              '" to "' +
              toTime +
              '"'
          );
          return PageObjects.header.setAbsoluteRange(fromTime, toTime);
        })
        .then(() => {
          return PageObjects.header.waitUntilLoadingHasFinished();
        });
    });

    describe('Time Series', () => {
      it('should show the correct count in the legend', async () => {
        const actualCount = await PageObjects.visualBuilder.getRhythmChartLegendValue();
        expect(actualCount).to.be('156');
      });

      it('should show the correct count in the legend with 2h offset', async () => {
        await PageObjects.visualBuilder.clickSeriesOption();
        await PageObjects.visualBuilder.enterOffsetSeries('2h');
        const actualCount = await PageObjects.visualBuilder.getRhythmChartLegendValue();
        expect(actualCount).to.be('293');
      });

      it('should show the correct count in the legend with -2h offset', async () => {
        await PageObjects.visualBuilder.enterOffsetSeries('-2h');
        const actualCount = await PageObjects.visualBuilder.getRhythmChartLegendValue();
        expect(actualCount).to.be('53');
      });

      after(async () => {
        // set back to no offset for the next test, an empty string didn't seem to work here
        await PageObjects.visualBuilder.enterOffsetSeries('0h');
      });
    });

    describe('metric', () => {
      before(async () => {
        await PageObjects.visualBuilder.clickMetric();
      });

      it('should not display spy panel toggle button', async () => {
        const spyToggleExists = await PageObjects.visualize.getSpyToggleExists();
        expect(spyToggleExists).to.be(false);
      });

      it('should show correct data', async () => {
        const expectedMetricValue = '156';

        return PageObjects.visualBuilder.getMetricValue().then(value => {
          log.debug(`metric value: ${value}`);
          expect(value).to.eql(expectedMetricValue);
        });
      });
    });

    // add a gauge test
    describe('gauge', () => {
      before(async () => {
        await PageObjects.visualBuilder.clickGauge();
        log.debug('clicked on Gauge');
      });

      it('should verfiy gauge label and count display', async () => {
        const labelString = await PageObjects.visualBuilder.getGaugeLabel();
        expect(labelString).to.be('Count');
        const gaugeCount = await PageObjects.visualBuilder.getGaugeCount();
        expect(gaugeCount).to.be('156');
      });
    });

    // add a top N test
    describe('topN', () => {
      before(async () => {
        await PageObjects.visualBuilder.clickTopN();
        log.debug('clicked on TopN');
      });

      it('should verfiy topN label and count display', async () => {
        const labelString = await PageObjects.visualBuilder.getTopNLabel();
        expect(labelString).to.be('Count');
        const gaugeCount = await PageObjects.visualBuilder.getTopNCount();
        expect(gaugeCount).to.be('156');
      });
    });

    describe('markdown', () => {
      before(async () => {
        await PageObjects.visualBuilder.clickMarkdown();
        await PageObjects.header.setAbsoluteRange(
          '2015-09-22 06:00:00.000',
          '2015-09-22 11:00:00.000'
        );
      });

      it('should allow printing raw timestamp of data', async () => {
        await PageObjects.visualBuilder.enterMarkdown(
          '{{ count.data.raw.[0].[0] }}'
        );
        const text = await PageObjects.visualBuilder.getMarkdownText();
        expect(text).to.be('1442901600000');
      });

      it.skip('should allow printing raw value of data', async () => {
        await PageObjects.visualBuilder.enterMarkdown(
          '{{ count.data.raw.[0].[1] }}'
        );
        const text = await PageObjects.visualBuilder.getMarkdownText();
        expect(text).to.be('6');
      });

      describe('allow time offsets', () => {
        before(async () => {
          await PageObjects.visualBuilder.enterMarkdown(
            '{{ count.data.raw.[0].[0] }}#{{ count.data.raw.[0].[1] }}'
          );
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
        await PageObjects.visualBuilder.clickTable();
        await PageObjects.header.setAbsoluteRange(
          '2015-09-22 06:00:00.000',
          '2015-09-22 11:00:00.000'
        );
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
        const expectedData =
          'OS\nCount\nios\n5\nosx\n3\nwin 7\n12\nwin 8\n13\nRows per page: 10';
        expect(tableData).to.be(expectedData);
      });
    });
  });
};
