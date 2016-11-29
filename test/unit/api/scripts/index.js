define(function (require) {
  var bdd = require('intern!bdd');
  var serverConfig = require('intern/dojo/node!../../../server_config');
  var request = require('intern/dojo/node!supertest-as-promised');
  var url = require('intern/dojo/node!url');
  var languages = require('./_languages');

  bdd.describe('scripts API', function () {
    request = request(url.format(serverConfig.servers.kibana) + '/api');

    languages(bdd, request);
  });
});
