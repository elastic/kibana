
import Common from './common';
import ConsolePage from './console_page';
import DashboardPage from './dashboard_page';
import DiscoverPage from './discover_page';
import HeaderPage from './header_page';
import SettingsPage from './settings_page';
import ShieldPage from './shield_page';
import VisualizePage from './visualize_page';

const common = new Common();
const consolePage = new ConsolePage();
const dashboardPage = new DashboardPage();
const discoverPage = new DiscoverPage();
const headerPage = new HeaderPage();
const settingsPage = new SettingsPage();
const shieldPage = new ShieldPage();
const visualizePage = new VisualizePage();

class PageObjects {

  constructor() {
    this.isInitialized = false;
    this.remote = undefined;
  }

  init(remote) {
    this.isInitialized = true;
    this.remote = remote;
    common.init(remote);
    consolePage.init(remote);
    dashboardPage.init(remote);
    discoverPage.init(remote);
    headerPage.init(remote);
    settingsPage.init(remote);
    shieldPage.init(remote);
    visualizePage.init(remote);
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

}

export default new PageObjects();
