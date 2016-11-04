import bdd from 'intern!bdd';
import serverConfig from 'intern/dojo/node!../../../server_config';
import ScenarioManager from 'intern/dojo/node!../../../fixtures/scenario_manager';
let request = require('intern/dojo/node!supertest-as-promised');
import url from 'intern/dojo/node!url';
import simulate from './_simulate';
import processors from './_processors';
import processorTypes from './processors/index';
import fieldCapabilities from './_field_capabilities';

bdd.describe('ingest API', function () {
  const scenarioManager = new ScenarioManager(url.format(serverConfig.servers.elasticsearch));
  request = request(url.format(serverConfig.servers.kibana) + '/api');

  bdd.before(function () {
    return scenarioManager.load('emptyKibana');
  });

  bdd.after(function () {
    return scenarioManager.unload('emptyKibana');
  });

  simulate(bdd, scenarioManager, request);
  processors(bdd, scenarioManager, request);
  processorTypes(bdd, scenarioManager, request);
  fieldCapabilities(bdd, scenarioManager, request);
});
