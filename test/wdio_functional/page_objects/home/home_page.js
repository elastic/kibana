import BasePage from '../common/base_page';

export default class HomePage extends BasePage {
  constructor(driver) {
    super(driver);
    this.addDataHeaderSelector = '//div[contains(@class, "euiTitle") and text()="Add Data To Kibana"';
  }

  init() {
    this.driver.waitForExist(this.addDataHeaderSelector);
    assert.equal('Add Data To Kibana', this.driver(this.addDataHeaderSelector).getText());
    this.driver.waitUntil(this.title === 'Kibana');
  }
}
