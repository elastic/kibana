import Keys from 'leadfoot/keys';

export function VisualBuilderPageProvider({ getService }) {
  const config = getService('config');
  const find = getService('find');
  const log = getService('log');
  const testSubjects = getService('testSubjects');

  const defaultFindTimeout = config.get('timeouts.find');

  class VisualBuilderPage {
    async clickMetric() {
      const nav = await find.allByCssSelector('.vis_editor__vis_picker-label', defaultFindTimeout);
      log.debug('found navigation items: ' + nav.length);
      await Promise.all(nav.map(async function (link) {
        const text = await link.getVisibleText();
        log.debug('nav text:' + text);
        if (text === 'Metric') {
          await link.click();
        }
      }));
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
