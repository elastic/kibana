import bdd from 'intern!bdd';
import serverConfig from 'intern/dojo/node!../../../server_config';
import ScenarioManager from 'intern/dojo/node!../../../fixtures/scenario_manager';
let request = require('intern/dojo/node!supertest-as-promised');
import url from 'intern/dojo/node!url';
import count from './_count';

bdd.describe('search API', function () {
  const scenarioManager = new ScenarioManager(url.format(serverConfig.servers.elasticsearch));
  request = request(url.format(serverConfig.servers.kibana) + '/api');

  bdd.before(function () {
    return scenarioManager.load('emptyKibana');
  });

  bdd.after(function () {
    return scenarioManager.unload('emptyKibana');
  });

  count(bdd, scenarioManager, request);
});
