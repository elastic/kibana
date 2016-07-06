
import expect from 'expect.js';

import {
  bdd,
  scenarioManager
} from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('console app', function describeIndexTests() {
  bdd.before(function () {
    PageObjects.common.debug('navigateTo console');
    return PageObjects.common.navigateToApp('console', false);
  });

  bdd.it('should show the default request', function () {
    var expectedRequest = [
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
      return PageObjects.common.try(function () {
        return PageObjects.console.getRequest()
        .then(function (actualRequest) {
          expect(actualRequest).to.eql(expectedRequest);
        });
      });
    });
  });

  bdd.it('default request response should contain .kibana' , function () {
    var expectedResponseContains = '"_index": ".kibana",';
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
