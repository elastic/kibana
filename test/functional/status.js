define(function (require) {
  var registerSuite = require('intern!object');
  var expect = require('intern/dojo/node!expect.js');
  var ScenarioManager = require('intern/dojo/node!../fixtures/scenarioManager');

  registerSuite(function () {
    var url = 'http://localhost:5620/status';
    var manager = new ScenarioManager('http://localhost:9220');

    return {
      'status': function () {
        return this.remote
          .get(url)
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
