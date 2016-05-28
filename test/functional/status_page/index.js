import { bdd, common } from '../../support';

(function () {
  var expect = require('expect.js');

  bdd.describe('status page', function () {
    bdd.before(function () {
      return common.navigateToApp('status_page', false);
    });

    bdd.it('should show the kibana plugin as ready', function () {
      var self = this;

      return common.tryForTime(6000, function () {
        return self.remote
        .findByCssSelector('.plugin_status_breakdown')
        .getVisibleText()
        .then(function (text) {
          expect(text.indexOf('kibana 1.0.0 Ready')).to.be.above(-1);
        });
      })
      .catch(common.handleError(self));
    });
  });
}());
