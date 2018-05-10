import BasePage from '../common/base_page';
import { testSubjectifySelector } from '../../helpers/helpers';

export default class ConsolePage extends BasePage {
  constructor(driver) {
    super(driver);
    this.breadCrumbSelector = 'div.kuiLocalBreadcrumb';
    this.requestEditorSelector = testSubjectifySelector('request-editor', 'css');
    this.editorContentSelector = 'div.ace_scroller > div.ace_content';
    this.requestEditorTextSelector = this.requestEditorSelector + ' > ' + this.editorContentSelector;
    this.playButtonSelector = testSubjectifySelector('send-request-button', 'css');
    this.responseEditorSelector = '#output';
    this.responseEditorTextSelector = this.responseEditorSelector + ' > ' + this.editorContentSelector;
    this.consoleSettingsButtonSelector = '//button' + testSubjectifySelector('consoleSettingsButton', 'xpath');
    this.fontSizeInputSelector = testSubjectifySelector('setting-font-size-input', 'css');
    this.saveSettingsButton = testSubjectifySelector('settings-save-button', 'css');
    this.DEFAULT_REQUEST = `
    
GET _search
{
  "query": {
    "match_all": {}
  }
}

`;
  }

  init() {
    this.driver.waitForExist(this.breadCrumbSelector);
    assert.equal('Dev Tools', this.driver(this.breadCrumbSelector).getText());
    this.driver.waitUntil(this.title === 'Console - Kibana');
  }

  get request() {
    return this.getElementText(this.requestEditorTextSelector);
  }

  set request(requestString) {

  }

  get response() {
    this.driver.waitUntil(() => {
      return this.getElementText(this.responseEditorTextSelector)
        .replace('{', '').replace('}', '') !== '';
    });
    return this.getElementText(this.responseEditorTextSelector);
  }

  //TODO: Submit Request Implementation
  // submitRequest(requestText) {
  //   this.clickPlay();
  // }

  get requestFontSize() {
    return this.driver.getCssProperty(this.requestEditorTextSelector
      + ':nth-child(1)  .ace_line:nth-child(1)', 'font-size')[0].value;
  }

  openSettings() {
    this.driver.waitUntil (() => {
      this.click(this.consoleSettingsButtonSelector);
      return this.driver.isVisible(this.fontSizeInputSelector);
    });
  }

  clickPlay() {
    this.click(this.playButtonSelector);
  }

  changeFontSize(size) {
    this.openSettings();
    this.setValue(this.fontSizeInputSelector, String(size), true);
    this.click(this.saveSettingsButton);

    this.driver.waitUntil (() => {
      const fontSize = this.driver.getCssProperty(this.requestEditorTextSelector
        + ':nth-child(1)  .ace_line:nth-child(1)', 'font-size')[0].value;
      return fontSize.replace('px', '')  === `${String(size)}`;
    });
  }
}
