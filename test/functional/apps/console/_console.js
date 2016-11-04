
import expect from 'expect.js';

import PageObjects from '../../../support/page_objects';
import { bdd } from '../../../support';

const DEFAULT_REQUEST = `

GET _search
{
  "query": {
    "match_all": {}
  }
}

`.trim();

bdd.describe('console app', function describeIndexTests() {
  bdd.before(function () {
    PageObjects.common.debug('navigateTo console');
    return PageObjects.common.navigateToApp('console', false);
  });

  bdd.it('should show the default request', function () {
    PageObjects.common.saveScreenshot('Console-help-expanded');
    // collapse the help pane because we only get the VISIBLE TEXT, not the part that is scrolled
    return PageObjects.console.collapseHelp()
    .then(function () {
      PageObjects.common.saveScreenshot('Console-help-collapsed');
      return PageObjects.common.try(function () {
        return PageObjects.console.getRequest()
        .then(function (actualRequest) {
          expect(actualRequest.trim()).to.eql(DEFAULT_REQUEST);
        });
      });
    });
  });

  bdd.it('default request response should contain .kibana' , function () {
    const expectedResponseContains = '"_index": ".kibana",';

    return PageObjects.console.clickPlay()
    .then(function () {
      PageObjects.common.saveScreenshot('Console-default-request');
      return PageObjects.common.try(function () {
        return PageObjects.console.getResponse()
        .then(function (actualResponse) {
          PageObjects.common.debug(actualResponse);
          expect(actualResponse).to.contain(expectedResponseContains);
        });
      });
    });
  });

  bdd.it('settings should allow changing the text size', async function () {
    await PageObjects.console.setFontSizeSetting(20);
    await PageObjects.common.try(async () => {
      // the settings are not applied synchronously, so we retry for a time
      expect(await PageObjects.console.getRequestFontSize()).to.be('20px');
    });

    await PageObjects.console.setFontSizeSetting(24);
    await PageObjects.common.try(async () => {
      // the settings are not applied synchronously, so we retry for a time
      expect(await PageObjects.console.getRequestFontSize()).to.be('24px');
    });
  });
});
