define(function (require) {
  var registerSuite = require('intern!object');
  var expect = require('intern/dojo/node!expect.js');
  var config = require('intern').config;
  var url = require('intern/dojo/node!url');
  var _ = require('intern/dojo/node!lodash');

  registerSuite(function () {

    return {
      'status': function () {
        return this.remote
          .get(url.format(_.assign(config.kibana, {
            pathname: '/status'
          })))
          .setFindTimeout(60000)
          .findByCssSelector('.plugin_status_breakdown')
          .getVisibleText()
          .then(function (text) {
            expect(text.indexOf('plugin:kibana Ready')).to.be.above(-1);
          });
      }
    };
  });
});
