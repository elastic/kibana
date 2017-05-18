export function GettingStartedPageProvider({ getService, getPageObjects }) {

  const log = getService('log');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');

  const PageObjects = getPageObjects(['common']);

  class GettingStartedPage {
    async doesContainerExist() {
      return await testSubjects.exists('gettingStartedContainer');
    }

    async optOut() {
      log.debug('Clicking opt-out link');
      await testSubjects.click('lnkGettingStartedOptOut');
      await retry.try(async () => {
        if (await this.doesContainerExist()) {
          throw new Error('Still on getting started page');
        }
      });
    }

    async navigateTo() {
      log.debug('Navigating directly to Getting Started page');
      await PageObjects.common.navigateToUrl('settings', 'kibana/getting_started');
    }
  }

  return new GettingStartedPage();
}
