define(function (require) {
  let bdd = require('intern!bdd');
  let serverConfig = require('intern/dojo/node!../../../server_config');
  let request = require('intern/dojo/node!supertest-as-promised');
  let url = require('intern/dojo/node!url');
  let languages = require('./_languages');

  bdd.describe('scripts API', function () {
    request = request(url.format(serverConfig.servers.kibana) + '/api');

    languages(bdd, request);
  });
});
