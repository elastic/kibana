import Keys from 'leadfoot/keys';

export function VisualBuilderPageProvider({ getService, getPageObjects }) {
  const find = getService('find');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'header']);

  class VisualBuilderPage {
    async clickMetric() {
      const button = await testSubjects.find('metricTsvbTypeBtn');
      await button.click();
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickMarkdown() {
      const button = await testSubjects.find('markdownTsvbTypeBtn');
      await button.click();
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async getMetricValue() {
      const metricValue = await find.byCssSelector('.rhythm_metric__primary-value');
      return metricValue.getVisibleText();
    }

    async enterMarkdown(markdown) {
      const input = await find.byCssSelector('.vis_editor__markdown-editor textarea');
      // Since we use ACE editor and that isn't really storing its value inside
      // a textarea we must really select all text and remove it, and cannot use
      // clearValue().
      await input.session.pressKeys([Keys.CONTROL, 'a']); // Select all text
      await input.session.pressKeys(Keys.NULL); // Release modifier keys
      await input.session.pressKeys(Keys.BACKSPACE); // Delete all content
      await input.type(markdown);
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async getMarkdownText() {
      const el = await find.byCssSelector('.vis_editor__visualization');
      return await el.getVisibleText();
    }

    async clickMarkdownData() {
      await testSubjects.click('markdownDataBtn');
    }

    async clickSeriesOption(nth = 0) {
      const el = await testSubjects.findAll('seriesOptions');
      await el[nth].click();
      await PageObjects.common.sleep(300);
    }

    async clearOffsetSeries() {
      const el = await testSubjects.find('offsetTimeSeries');
      await el.clearValue();
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async enterOffsetSeries(value) {
      const el = await testSubjects.find('offsetTimeSeries');
      await el.clearValue();
      await el.type(value);
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async getRhythmChartLegendValue() {
      const metricValue = await find.byCssSelector('.rhythm_chart__legend_value');
      await metricValue.session.moveMouseTo(metricValue);
      return await metricValue.getVisibleText();
    }

    async clickGauge() {
      await testSubjects.click('gaugeTsvbTypeBtn');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async getGaugeLabel() {
      const gaugeLabel = await find.byCssSelector('.thorHalfGauge__label');
      return await gaugeLabel.getVisibleText();
    }

    async getGaugeCount() {
      const gaugeCount = await find.byCssSelector('.thorHalfGauge__value');
      return await gaugeCount.getVisibleText();
    }

    async clickTopN()
    {
      await testSubjects.click('top_nTsvbTypeBtn');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async getTopNLabel() {
      const topNLabel = await find.byCssSelector('.rhythm_top_n__label');
      return await topNLabel.getVisibleText();
    }

    async getTopNCount() {
      const gaugeCount = await find.byCssSelector('.rhythm_top_n__value');
      return await gaugeCount.getVisibleText();
    }

    async clickTable() {
      await testSubjects.click('tableTsvbTypeBtn');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }


    async selectGroupByField(fieldName) {
      const element = await testSubjects.find('groupByField');
      const input = await element.findByCssSelector('.Select-input input');
      await input.type(fieldName);
      const option = await element.findByCssSelector('.Select-option');
      await option.click();
    }

    async setLabelValue(value) {
      const el = await testSubjects.find('columnLabelName');
      await el.clearValue();
      await el.type(value);
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async getViewTable() {
      const tableView = await testSubjects.find('tableView');
      return await tableView.getVisibleText();
    }


  }

  return new VisualBuilderPage();
}
