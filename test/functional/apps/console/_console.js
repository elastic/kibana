import expect from 'expect.js';

const DEFAULT_REQUEST = `

GET _search
{
  "query": {
    "match_all": {}
  }
}

`.trim();

export default function ({ getService, getPageObjects }) {
  const retry = getService('retry');
  const log = getService('log');
  const PageObjects = getPageObjects(['common', 'console']);

  describe('console app', function describeIndexTests() {
    before(function () {
      log.debug('navigateTo console');
      return PageObjects.common.navigateToApp('console');
    });

    it('should show the default *%^$# @ ! ~ request', function () {
      // collapse the help pane because we only get the VISIBLE TEXT, not the part that is scrolled
      return PageObjects.console.collapseHelp()
        .then(function () {
          return retry.try(function () {
            return PageObjects.console.getRequest()
              .then(function (actualRequest) {
                expect(actualRequest.trim()).to.eql(DEFAULT_REQUEST);
              });
          });
        });
    });

    it('default request response should include `"timed_out": false`', function () {
      const expectedResponseContains = '"timed_out": false,';

      return PageObjects.console.clickPlay()
        .then(function () {
          return retry.try(function () {
            return PageObjects.console.getResponse()
              .then(function (actualResponse) {
                log.debug(actualResponse);
                expect(actualResponse).to.contain(expectedResponseContains);
              });
          });
        });
    });

    it('settings should allow changing the text size', async function () {
      await PageObjects.console.setFontSizeSetting(20);
      await retry.try(async () => {
        // the settings are not applied synchronously, so we retry for a time
        expect(await PageObjects.console.getRequestFontSize()).to.be('20px');
      });

      await PageObjects.console.setFontSizeSetting(24);
      await retry.try(async () => {
        // the settings are not applied synchronously, so we retry for a time
        expect(await PageObjects.console.getRequestFontSize()).to.be('24px');
      });
    });
  });
}
