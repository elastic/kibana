import Keys from 'leadfoot/keys';

export function VisualBuilderPageProvider({ getService }) {
  const find = getService('find');
  const testSubjects = getService('testSubjects');

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
    }

    async getMarkdownText() {
      const el = await find.byCssSelector('.vis_editor__visualization');
      return await el.getVisibleText();
    }

    async clickMarkdownData() {
      const el = await testSubjects.find('markdownDataBtn');
      await el.click();
    }

    async clickSeriesOption(nth = 0) {
      const el = await testSubjects.findAll('seriesOptions');
      await el[nth].click();
    }

    async enterOffsetSeries(value) {
      const el = await testSubjects.find('offsetTimeSeries');
      await el.clearValue();
      await el.type(value);
    }
  }

  return new VisualBuilderPage();
}
