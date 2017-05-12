export function GettingStartedPageProvider({ getService }) {

  const log = getService('log');
  const testSubjects = getService('testSubjects');

  class GettingStartedPage {
    async clickOptOutLink() {
      log.debug('Clicking opt-out link');
      await testSubjects.click('lnkGettingStartedOptOut');
    }
  }

  return new GettingStartedPage();
}