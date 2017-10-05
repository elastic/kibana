export function VisualBuilderPageProvider({ getService }) {
  const config = getService('config');
  const find = getService('find');
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
  }

  return new VisualBuilderPage();
}
