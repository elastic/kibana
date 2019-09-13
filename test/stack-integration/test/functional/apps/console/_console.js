
import expect from 'expect.js';

import {
  bdd
} from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('console app', function describeIndexTests() {
  bdd.before(function () {
    PageObjects.common.debug('navigateTo console');
    return PageObjects.common.navigateToApp('console');
  });

  bdd.it('should show the default request', function () {
    const expectedRequest = [
      'GET _search',
      '{',
      '  "query": {',
      '    "match_all": {}',
      '  }',
      '}',
      ''
    ];
    PageObjects.common.saveScreenshot('Console-help-expanded');
    // collapse the help pane because we only get the VISIBLE TEXT, not the part that is scrolled
    return PageObjects.console.collapseHelp()
    .then(function () {
      PageObjects.common.saveScreenshot('Console-help-collapsed');
      return PageObjects.common.tryForTime(10000, function () {
        return PageObjects.console.getRequest()
        .then(function (actualRequest) {
          expect(actualRequest).to.eql(expectedRequest);
        });
      });
    });
  });

  bdd.it('default request response should contain failed 0' , function () {
    const expectedResponseContains = '"failed": 0';
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
});
