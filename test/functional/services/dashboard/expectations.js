import expect from 'expect.js';

export function DashboardExpectProvider({ getService, getPageObjects }) {
  const log = getService('log');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['dashboard']);

  return new class DashboardExpect {
    async pieSliceCount(expectedCount) {
      log.debug(`expectPieSliceCount(${expectedCount})`);
      return await retry.try(async () => {
        const slicesCount = await PageObjects.dashboard.getPieSliceCount();
        expect(slicesCount).to.eql(expectedCount);
      });
    }

    async panelCount(expectedCount) {
      return retry.try(async () => {
        const panelCount = await PageObjects.dashboard.getPanelCount();
        expect(panelCount).to.eql(expectedCount);
      });
    }

    async selectedLegendColorCount(color, count) {
      return retry.try(async () => {
        const selectedLegendColor = await testSubjects.findAll(`legendSelectColor-${color}`);
        expect(selectedLegendColor).to.eql(count);
      });
    }
  };
}
