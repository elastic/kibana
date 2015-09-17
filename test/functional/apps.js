define(function (require) {
  var registerSuite = require('intern!object');
  var expect = require('intern/dojo/node!expect.js');

  registerSuite(function () {
    var url = 'http://localhost:5620/apps';
    return {
      'apps': function () {
        return this.remote
          .get(url)
          .setFindTimeout(60000)
          .findByCssSelector('a[href="/app/kibana"]')
          .getVisibleText()
          .then(function (text) {
            expect(text).to.eql('Kibana\nthe kibana you know and love');
          });
      }
    };
  });
});
