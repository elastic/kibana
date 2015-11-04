define(function (require) {
  var bdd = require('intern!bdd');
  var expect = require('intern/dojo/node!expect.js');
  var config = require('intern').config;
  var getUrl = require('intern/dojo/node!../../utils/getUrl');
  var Common = require('../../support/pages/Common');

  bdd.describe('status page', function () {
    var common;

    bdd.before(function () {
      common = new Common(this.remote);
    });

    bdd.beforeEach(function () {
      // load the status page
      return this.remote.get(getUrl(config.servers.kibana, 'status'));
    });

    bdd.it('should show the kibana plugin as ready', function () {
      var self = this;

      return common.tryForTime(6000, function () {
        return self.remote
        .findByCssSelector('.plugin_status_breakdown')
        .getVisibleText()
        .then(function (text) {
          expect(text.indexOf('plugin:kibana Ready')).to.be.above(-1);
        })
      })
      .catch(common.handleError(self));
    });
  });
});