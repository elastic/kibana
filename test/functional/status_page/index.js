define(function (require) {
  var bdd = require('intern!bdd');
  var expect = require('intern/dojo/node!expect.js');
  var config = require('intern').config;
  var Common = require('../../support/pages/common');

  bdd.describe('status page', function () {
    var common;

    bdd.before(function () {
      common = new Common(this.remote);
      // load the status page
      return common.navigateToApp('status_page', false);
    });

    bdd.it('should show the kibana plugin as ready', function () {
      var self = this;

      return common.tryForTime(6000, function () {
        return self.remote
        .findByCssSelector('.plugin_status_breakdown')
        .getVisibleText()
        .then(function (text) {
          expect(text.indexOf('plugin:kibana Ready')).to.be.above(-1);
        });
      })
      .catch(common.handleError(self));
    });
  });
});
