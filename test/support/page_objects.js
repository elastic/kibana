
import Common from './pages/common.js';
import ConsolePage from './pages/console_page.js';
import DashboardPage from './pages/dashboard_page.js';
import DiscoverPage from './pages/discover_page.js';
import HeaderPage from './pages/header_page.js';
import SettingsPage from './pages/settings_page.js';
import ShieldPage from './pages/shield_page.js';
import VisualizePage from './pages/visualize_page.js';

const common = new Common();
const consolePage = new ConsolePage();
const dashboardPage = new DashboardPage();
const discoverPage = new DiscoverPage();
const headerPage = new HeaderPage();
const settingsPage = new SettingsPage();
const shieldPage = new ShieldPage();
const visualizePage = new VisualizePage();

export default {
  isInitialized: false,

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
  },

  assertInitialized() {
    if (this.isInitialized) {
      return true;
    }
    throw new TypeError('Please call init and provide a reference to `remote` before trying to access a page object.');
  },

  get common() {
    return this.assertInitialized() && common;
  },

  get console() {
    return this.assertInitialized() && consolePage;
  },

  get dashboard() {
    return this.assertInitialized() && dashboardPage;
  },

  get discover() {
    return this.assertInitialized() && discoverPage;
  },

  get header() {
    return this.assertInitialized() && headerPage;
  },

  get settings() {
    return this.assertInitialized() && settingsPage;
  },

  get shield() {
    return this.assertInitialized() && shieldPage;
  },

  get visualize() {
    return this.assertInitialized() && visualizePage;
  },
};
