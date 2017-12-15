import Keys from 'leadfoot/keys';

export function VisualBuilderPageProvider({ getService, getPageObjects }) {
  const find = getService('find');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'header']);

  class VisualBuilderPage {
    async clickMetric() {
      const button = await testSubjects.find('metricTsvbTypeBtn');
      await button.click();
    }

    async clickMarkdown() {
      const button = await testSubjects.find('markdownTsvbTypeBtn');
      await button.click();
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
  }

  return new VisualBuilderPage();
}
