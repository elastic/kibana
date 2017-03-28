export function MonitoringPageProvider({ getService }) {
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
      return getRemote(3000)
      .findDisplayedByCssSelector('button.btn-banner')
      .click();
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
