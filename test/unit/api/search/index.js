define(function (require) {
  const bdd = require('intern!bdd');
  const serverConfig = require('intern/dojo/node!../../../server_config');
  const { emptyKibana } = require('intern/dojo/node!../lib/es');
  let request = require('intern/dojo/node!supertest-as-promised');
  const url = require('intern/dojo/node!url');
  const count = require('./_count');

  bdd.describe('search API', function () {
    request = request(url.format(serverConfig.servers.kibana) + '/api');

    bdd.before(function () {
      return emptyKibana.setup();
    });

    bdd.after(function () {
      return emptyKibana.teardown();
    });

    count(bdd, request);
  });
});
