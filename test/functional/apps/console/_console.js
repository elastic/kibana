import {
  bdd,
  scenarioManager,
  common,
  consolePage
} from '../../../support';

(function () {
  var expect = require('expect.js');

  (function () {
    bdd.describe('console app', function describeIndexTests() {
      bdd.before(function () {
        common.debug('navigateTo console');
        return common.navigateToApp('console', false)
        .catch(common.handleError(this));
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
        // collapse the help pane because we only get the VISIBLE TEXT, not the part that is scrolled
        return consolePage.collapseHelp()
        .then(function () {
          return common.try(function () {
            return consolePage.getRequest()
            .then(function (actualRequest) {
              expect(actualRequest).to.eql(expectedRequest);
            });
          });
        })
        .catch(common.handleError(this));
      });

      bdd.it('default request response should contain .kibana' , function () {
        var expectedResponseContains = '"_index": ".kibana",';
        return consolePage.clickPlay()
        .then(function () {
          return common.try(function () {
            return consolePage.getResponse()
            .then(function (actualResponse) {
              common.debug(actualResponse);
              expect(actualResponse).to.contain(expectedResponseContains);
            });
          });
        })
        .catch(common.handleError(this));
      });


    });
  }());
}());
