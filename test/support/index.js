
import url from 'url';

import {
  BddWrapper,
  ElasticDump,
  EsClient,
} from './utils';
import ScenarioManager from '../fixtures/scenario_manager';
import PageObjects from './page_objects';

// Intern values provided via the root index file of the test suite.
const kbnInternVars = global.__kibana__intern__;
exports.intern = kbnInternVars.intern;
exports.bdd = new BddWrapper(kbnInternVars.bdd);

// Config options
const config = exports.config = kbnInternVars.intern.config;
exports.defaultTimeout = config.defaultTimeout;
exports.defaultTryTimeout = config.defaultTryTimeout;
exports.defaultFindTimeout = config.defaultFindTimeout;

// Helper instances
exports.scenarioManager =
  new ScenarioManager(url.format(config.servers.elasticsearch));
exports.elasticDump = new ElasticDump();
exports.esClient = new EsClient(url.format(config.servers.elasticsearch));

// TODO: We're using this facade to avoid breaking existing functionality as
// we migrate test suites to the PageObject service. Once they're all migrated
// over, we can delete this facade code.
exports.init = function init(remote) {
  exports.remote = remote;
};
