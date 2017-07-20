export function MonitoringPageProvider({ getService }) {
  const testSubjects = getService('testSubjects');

  const getRemote = (timeout) =>
    getService('remote')
      .setFindTimeout(
        timeout || getService('config').get('timeouts.find')
      );

  class MonitoringPage {
    getWelcome() {
      return getRemote()
      .findDisplayedByCssSelector('render-directive')
      .getVisibleText();
    }

    dismissWelcome() {
      return testSubjects.click('notifierDismissButton');
    }

    getToasterContents() {
      return getRemote()
      .findByCssSelector('div.toaster-container.ng-isolate-scope')
      .getVisibleText();
    }

    clickOptOut() {
      return getRemote().findByLinkText('Opt out here').click();
    }

  }

  return new MonitoringPage();
}
