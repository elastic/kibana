
import Common from './common';
import ConsolePage from './console_page';
import DashboardPage from './dashboard_page';
import DiscoverPage from './discover_page';
import HeaderPage from './header_page';
import SettingsPage from './settings_page';
import ShieldPage from './shield_page';
import VisualizePage from './visualize_page';
import MonitoringPage from './monitoring_page';

class PageObjects {
  constructor() {
    this._onInitialization = [];

    // define all of the page objects that need to be exposed
    this.addPageObject('common', new Common());
    this.addPageObject('console', new ConsolePage());
    this.addPageObject('dashboard', new DashboardPage());
    this.addPageObject('discover', new DiscoverPage());
    this.addPageObject('header', new HeaderPage());
    this.addPageObject('settings', new SettingsPage());
    this.addPageObject('shield', new ShieldPage());
    this.addPageObject('visualize', new VisualizePage());
    this.addPageObject('monitoring', new MonitoringPage());
  }

  init(remote) {
    this.isInitialized = true;
    this.remote = remote;
    this._onInitialization.forEach(fn => fn());
    this._onInitialization = null;
  }

  /**
   *  Add a page object to be used in the functional tests. If the page object
   *  is accessed before initialization a Error will be thrown. This needs to
   *  be a function so plugins can expose their PageObjects.
   *
   *  @param {string} name - the property name for the page object
   *  @param {PageObject} pageObject - the page object to expose
   */
  addPageObject(name, pageObject) {
    let initialized = false;

    this._onInitialization.push(() => {
      pageObject.init(this.remote);
      initialized = true;
    });

    Object.defineProperty(this, name, {
      configurable: true,
      get() {
        if (initialized) return pageObject;

        throw new TypeError(
          `Please call init and provide a reference to \`remote\` before trying to access the ${name} page object.`
        );
      }
    });
  }
}

export default new PageObjects();
