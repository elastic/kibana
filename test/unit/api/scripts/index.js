define(function (require) {
  const bdd = require('intern!bdd');
  const serverConfig = require('intern/dojo/node!../../../server_config');
  let request = require('intern/dojo/node!supertest-as-promised');
  const url = require('intern/dojo/node!url');
  const languages = require('./_languages');

  bdd.describe('scripts API', function () {
    request = request(url.format(serverConfig.servers.kibana) + '/api');

    languages(bdd, request);
  });
});
