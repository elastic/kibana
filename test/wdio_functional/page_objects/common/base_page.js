
export default class BasePage {

  constructor(driver) {
    this.driver = driver;
  }

  get title() {
    return this.driver.getTitle();
  }


  findElement(selector) {
    this.driver.waitForExist(selector);
    this.driver.waitForVisible(selector);
    return this.driver.element(selector);
  }

  findElements(selector) {
    this.driver.waitForExist(selector);
    return this.driver.elements(selector);
  }

  click(selector) {
    this.findElement(selector);
    this.driver.click(selector);
  }

  clear(selector) {
    this.findElement(selector);
    this.driver.clearElement(selector);
  }

  //This call will let you either add text to a text field or replace it.
  setValue(selector, value, clear = true) {
    if (clear) {
      this.clear(selector);
    }
    this.click(selector);
    this.driver.addValue(selector, value);
  }

  getElementText(selector) {
    this.findElement(selector);
    return this.driver.getText(selector);
  }

  get sideNav() {
    const basePath = this;
    return new class SideNav {

      constructor() {
        this.consoleLinkSelector = '//a[@data-test-subj="appLink" and @aria-label="Dev Tools"]';
      }

      navigateToApp(app) {
        switch (app) {
          case 'Discover':
            break;
          case 'Visualize':
            break;
          case 'Dashboard':
            break;
          case 'Timelion':
            break;
          case 'Console':
            basePath.click(this.consoleLinkSelector);
            const ConsolePage = require('../console/console_page').default;
            return new ConsolePage(basePath.driver);
          case 'Management':
            break;
          default:
            throw new Error(`${app} is an invalid application`);

        }
      }
    };
  }

  //TODO:Add Navigate Home Implementation
  navigateHome() {

  }
}

export class PageRegion extends BasePage {
  constructor(driver, root) {
    super(driver);
    this.root = root;
  }

  findElement(selector) {
    this.driver.element(this.root).findElement(selector);
  }
}
