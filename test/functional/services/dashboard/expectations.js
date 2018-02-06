import expect from 'expect.js';

export function DashboardExpectProvider({ getService, getPageObjects }) {
  const log = getService('log');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['dashboard']);

  return new class DashboardExpect {
    async pieSliceCount(expectedCount) {
      log.debug(`DashboardExpect.expectPieSliceCount(${expectedCount})`);
      await retry.try(async () => {
        const slicesCount = await PageObjects.dashboard.getPieSliceCount();
        expect(slicesCount).to.be(expectedCount);
      });
    }

    async panelCount(expectedCount) {
      log.debug(`DashboardExpect.panelCount(${expectedCount})`);
      await retry.try(async () => {
        const panelCount = await PageObjects.dashboard.getPanelCount();
        expect(panelCount).to.be(expectedCount);
      });
    }

    async selectedLegendColorCount(color, expectedCount) {
      log.debug(`DashboardExpect.selectedLegendColorCount(${color}, ${expectedCount})`);
      await retry.try(async () => {
        const selectedLegendColor = await testSubjects.findAll(`legendSelectedColor-${color}`);
        expect(selectedLegendColor.length).to.be(expectedCount);
      });
    }
  };
}
