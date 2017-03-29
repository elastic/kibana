define(function (require) {
  const bdd = require('intern!bdd');
  const serverConfig = require('intern/dojo/node!../../../server_config');
  const { emptyKibana } = require('intern/dojo/node!../lib/es');
  let request = require('intern/dojo/node!supertest-as-promised');
  const url = require('intern/dojo/node!url');
  const fieldCapabilities = require('./_field_capabilities');

  bdd.describe('ingest API', function () {
    request = request(url.format(serverConfig.servers.kibana) + '/api');

    bdd.before(function () {
      return emptyKibana.setup();
    });

    bdd.after(function () {
      return emptyKibana.teardown();
    });

    fieldCapabilities(bdd, request);
  });
});
