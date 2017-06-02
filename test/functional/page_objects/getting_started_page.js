export function GettingStartedPageProvider({ getService }) {

  const log = getService('log');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');

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
  }

  return new GettingStartedPage();
}
