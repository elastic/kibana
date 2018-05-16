import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'header', 'home']);

  describe('app plugins', function describeIndexTests() {

    before(async () => {
      await PageObjects.common.navigateToApp('settings');
    });

    it('should show in navigation', async () => {
      const link = await PageObjects.header.getGlobalNavigationLink('Test Plugin App');
      expect(link).not.to.be(undefined);
    });

    it('should navigate to the app', async () => {
      const link = await PageObjects.header.getGlobalNavigationLink('Test Plugin App');
      await link.click();
      const pluginContent = await testSubjects.find('pluginContent');
      expect(await pluginContent.getVisibleText()).to.be('Super simple app plugin');
    });

  });
}
