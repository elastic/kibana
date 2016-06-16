import {
  bdd,
  scenarioManager,
  common,
  consolePage
} from '../../../support';

var expect = require('expect.js');

bdd.describe('console app', function describeIndexTests() {
  bdd.before(function () {
    common.debug('navigateTo console');
    return common.navigateToApp('console', false);
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
    common.saveScreenshot('Console-help-expanded');
    // collapse the help pane because we only get the VISIBLE TEXT, not the part that is scrolled
    return consolePage.collapseHelp()
    .then(function () {
      common.saveScreenshot('Console-help-collapsed');
      return common.try(function () {
        return consolePage.getRequest()
        .then(function (actualRequest) {
          expect(actualRequest).to.eql(expectedRequest);
        });
      });
    });
  });

  bdd.it('default request response should contain .kibana' , function () {
    var expectedResponseContains = '"_index": ".kibana",';
    return consolePage.clickPlay()
    .then(function () {
      common.saveScreenshot('Console-default-request');
      return common.try(function () {
        return consolePage.getResponse()
        .then(function (actualResponse) {
          common.debug(actualResponse);
          expect(actualResponse).to.contain(expectedResponseContains);
        });
      });
    });
  });
});
