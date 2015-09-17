define(function (require) {
  var registerSuite = require('intern!object');
  var expect = require('intern/dojo/node!expect.js');

  registerSuite(function () {
    var url = 'http://localhost:5620/status';
    return {
      'status': function () {
        return this.remote
          .get(url)
          .refresh()
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
