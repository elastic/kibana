
import Common from './common';
import ConsolePage from './console_page';
import ContextPage from './context_page';
import DashboardPage from './dashboard_page';
import DiscoverPage from './discover_page';
import HeaderPage from './header_page';
import SettingsPage from './settings_page';
import ShieldPage from './shield_page';
import VisualizePage from './visualize_page';
import MonitoringPage from './monitoring_page';
import DocTable from './doc_table';

const common = new Common();
const consolePage = new ConsolePage();
const contextPage = new ContextPage();
const dashboardPage = new DashboardPage();
const discoverPage = new DiscoverPage();
const headerPage = new HeaderPage();
const settingsPage = new SettingsPage();
const shieldPage = new ShieldPage();
const visualizePage = new VisualizePage();
const monitoringPage = new MonitoringPage();

const docTable = new DocTable();

class PageObjects {

  constructor() {
    this.isInitialized = false;
    this.remote = undefined;
    this.pageObjects = [
      common,
      consolePage,
      contextPage,
      dashboardPage,
      discoverPage,
      headerPage,
      settingsPage,
      shieldPage,
      visualizePage,
      monitoringPage,
      docTable,
    ];
  }

  init(remote) {
    this.isInitialized = true;
    this.remote = remote;
    this.pageObjects.map((pageObject) => pageObject.init(remote));
  }

  assertInitialized() {
    if (this.isInitialized) {
      return true;
    }
    throw new TypeError('Please call init and provide a reference to `remote` before trying to access a page object.');
  }

  get common() {
    return this.assertInitialized() && common;
  }

  get console() {
    return this.assertInitialized() && consolePage;
  }

  get context() {
    return this.assertInitialized() && contextPage;
  }

  get dashboard() {
    return this.assertInitialized() && dashboardPage;
  }

  get discover() {
    return this.assertInitialized() && discoverPage;
  }

  get header() {
    return this.assertInitialized() && headerPage;
  }

  get settings() {
    return this.assertInitialized() && settingsPage;
  }

  get shield() {
    return this.assertInitialized() && shieldPage;
  }

  get visualize() {
    return this.assertInitialized() && visualizePage;
  }

  get monitoring() {
    return this.assertInitialized() && monitoringPage;
  }

  get docTable() {
    return this.assertInitialized() && docTable;
  }

}

export default new PageObjects();
