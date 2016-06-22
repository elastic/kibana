import url from 'url';
import EsClient from './es_client';
import ElasticDump from './elastic_dump';
import BddWrapper from './bdd_wrapper';
import ScenarioManager from '../fixtures/scenario_manager';
import Common from './pages/common';
import DiscoverPage from './pages/discover_page';
import SettingsPage from './pages/settings_page';
import HeaderPage from './pages/header_page';
import VisualizePage from './pages/visualize_page';
import DashboardPage from './pages/dashboard_page';
import ShieldPage from './pages/shield_page';
import ConsolePage from './pages/console_page';

const kbnInternVars = global.__kibana__intern__;

exports.intern = kbnInternVars.intern;
exports.config = exports.intern.config;
exports.defaultTimeout = exports.config.defaultTimeout;
exports.defaultTryTimeout = exports.config.defaultTryTimeout;
exports.defaultFindTimeout = exports.config.defaultFindTimeout;
exports.scenarioManager = new ScenarioManager(url.format(exports.config.servers.elasticsearch));
exports.esClient = new EsClient(url.format(exports.config.servers.elasticsearch));
exports.bdd = new BddWrapper(kbnInternVars.bdd);

const delayedExports = [{
  name: 'remote',
  exportProvider: (suite) => suite.remote
}, {
  name: 'common',
  exportProvider: () => new Common()
}, {
  name: 'discoverPage',
  exportProvider: () => new DiscoverPage()
}, {
  name: 'headerPage',
  exportProvider: () => new HeaderPage()
}, {
  name: 'settingsPage',
  exportProvider: () => new SettingsPage()
}, {
  name: 'visualizePage',
  exportProvider: () => new VisualizePage()
}, {
  name: 'dashboardPage',
  exportProvider: () => new DashboardPage()
}, {
  name: 'shieldPage',
  exportProvider: () => new ShieldPage()
}, {
  name: 'consolePage',
  exportProvider: () => new ConsolePage()
}, {
  name: 'elasticDump',
  exportProvider: () => new ElasticDump()
}];

delayedExports.forEach(exportConfig => {
  delayExportUntilInit(
    exportConfig.name,
    exportConfig.exportProvider
  );
});

// Creates an export for values that aren't actually avaialable until
// tests start to run. These getters will throw errors if the export
// is accessed before it's available, hopefully making debugging easier.
// Once the first before() handler is called the onInit() call
// will fire and rewrite all of these exports to be their correct value.
function delayExportUntilInit(name, provideExport) {
  Object.defineProperty(exports, name, {
    configurable: true,
    get() {
      throw new TypeError(
        'Remote is not available until tests start to run. Move your ' +
        'usage of the import inside a test setup hook or a test itself.'
      );
    }
  });

  kbnInternVars.onInit(function defineExport() {
    Object.defineProperty(exports, name, {
      value: provideExport(this),
    });
  });
}
