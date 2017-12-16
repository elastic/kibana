export function VisualBuilderPageProvider({ getService }) {
  const config = getService('config');
  const find = getService('find');
  const remote = getService('remote');
  const log = getService('log');

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

    async getMetricValue() {
      const metricValue = await find.byCssSelector('.rhythm_metric__primary-value');
      return metricValue.getVisibleText();
    }

    async getSecondaryMetricValue() {
      const metricValue = await find.byCssSelector('.rhythm_metric__secondary-value');
      return metricValue.getVisibleText();
    }

    async addSeries() {
      const nav = await find.allByCssSelector('.vis_editor__series:first-child button[aria-label="Add Series"]', defaultFindTimeout);
      log.debug('found series items: ' + nav.length);
      await Promise.all(nav.map(async function (link) {
        await link.click();
      }));
    }

    async addMetric() {
      const nav = await find.allByCssSelector('.vis_editor__series:last-child button[aria-label="Add Metric"]', defaultFindTimeout);
      log.debug('found series items: ' + nav.length);
      await Promise.all(nav.map(async function (link) {
        await link.click();
      }));
    }

    async typeSelect(selector, value) {
      await remote.findByCssSelector(`${selector} .Select-control`).click();
      await remote.findByCssSelector(`${selector} .Select-input > input`)
        .clearValue()
        .type(`${value}\n`);
    }

    async selectItem(selector, value) {
      await this.typeSelect(selector, value);
    }

  }

  return new VisualBuilderPage();
}
