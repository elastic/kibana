
import url from 'url';

import {
  BddWrapper,
  EsIndexDump,
  EsClient,
  Log,
} from './utils';

import { EsIndexDump } from './es_index_dump';
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
exports.screenshotsConfig = config.screenshots;

// Helper instances
exports.scenarioManager =
  new ScenarioManager(url.format(config.servers.elasticsearch));

exports.esIndexDump = new EsIndexDump({
  esUrl: url.format(config.servers.elasticsearch),
  log: (...args) => Log.debug(...args),
  ...config.esIndexDump
});

exports.esClient = new EsClient(url.format(config.servers.elasticsearch));

// TODO: We're using this facade to avoid breaking existing functionality as
// we migrate test suites to the PageObject service. Once they're all migrated
// over, we can delete this facade code.
exports.init = function init(remote) {
  exports.remote = remote;
};
