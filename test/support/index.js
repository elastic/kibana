import url from 'url';
import ScenarioManager from '../fixtures/scenario_manager';
import Common from './pages/common';
import DiscoverPage from './pages/discover_page';
import SettingsPage from './pages/settings_page';
import HeaderPage from './pages/header_page';
import VisualizePage from './pages/visualize_page';

const kbnInternVars = global.__kibana__intern__;

const NOT_AVAILABLE = {
  toString() { return 'NOT AVAILABLE UNTIL TESTS START TO RUN'; }
};

export const bdd = kbnInternVars.bdd;
export const intern = kbnInternVars.intern;
export const config = intern.config;
export const defaultTimeout = config.defaultTimeout;
export const scenarioManager = new ScenarioManager(url.format(config.servers.elasticsearch));

export let remote = NOT_AVAILABLE;
export let common = NOT_AVAILABLE;
export let discoverPage = NOT_AVAILABLE;
export let settingsPage = NOT_AVAILABLE;
export let headerPage = NOT_AVAILABLE;
export let visualizePage = NOT_AVAILABLE;

kbnInternVars.onEarliestBefore(function () {
  remote = this.remote;
  common = new Common();
  discoverPage = new DiscoverPage();
  headerPage = new HeaderPage();
  settingsPage = new SettingsPage();
  visualizePage = new VisualizePage();
});
