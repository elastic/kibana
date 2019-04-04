/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { scrollIntoViewIfNecessary } from './scroll_into_view_if_necessary';
import { delay } from 'bluebird';
import { PNG } from 'pngjs';
import cheerio from 'cheerio';
import testSubjSelector from '@kbn/test-subj-selector';

export class WebElementWrapper {
  constructor(webElement, webDriver, timeout, fixedHeaderHeight, log) {
    if (webElement instanceof WebElementWrapper) {
      return webElement;
    }

    this._webElement = webElement;
    this._webDriver = webDriver;
    this._driver = webDriver.driver;
    this._By = webDriver.By;
    this._Keys = webDriver.Key;
    this._LegacyAction = webDriver.LegacyActionSequence;
    this._defaultFindTimeout = timeout;
    this._fixedHeaderHeight = fixedHeaderHeight;
    this._logger = log;
  }

  _wrap(otherWebElement) {
    return new WebElementWrapper(otherWebElement, this._webDriver, this._defaultFindTimeout, this._fixedHeaderHeight, this._logger);
  }

  _wrapAll(otherWebElements) {
    return otherWebElements.map(e => this._wrap(e));
  }

  /**
   * Returns whether or not the element would be visible to an actual user. This means
   * that the following types of elements are considered to be not displayed:
   *
   *  - Elements with display: none
   *  - Elements with visibility: hidden
   *  - Elements positioned outside of the viewport that cannot be scrolled into view
   *  - Elements with opacity: 0
   *  - Elements with no offsetWidth or offsetHeight
   *
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#isDisplayed
   *
   * @return {Promise<boolean>}
   */
  async isDisplayed() {
    return await this._webElement.isDisplayed();
  }

  /**
   * Tests whether this element is enabled, as dictated by the disabled attribute.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#isEnabled
   *
   * @return {Promise<boolean>}
   */
  async isEnabled() {
    return await this._webElement.isEnabled();
  }

  /**
   * Tests whether this element is selected.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#isSelected
   *
   * @return {Promise<boolean>}
   */
  async isSelected() {
    return await this._webElement.isSelected();
  }

  /**
   * Clicks on this element.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#click
   *
   * @return {Promise<void>}
   */
  async click() {
    await this.scrollIntoViewIfNecessary();
    await this._webElement.click();
  }

  /**
   * Clear the value of this element. This command has no effect if the underlying DOM element
   * is neither a text INPUT element nor a TEXTAREA element.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#clear
   *
   * @return {Promise<void>}
   */
  async clearValue() {
    await this._webElement.clear();
  }

  /**
   * Types a key sequence on the DOM element represented by this instance. Modifier keys
   * (SHIFT, CONTROL, ALT, META) are stateful; once a modifier is processed in the key sequence,
   * that key state is toggled until one of the following occurs:
   *
   * The modifier key is encountered again in the sequence. At this point the state of the key is
   * toggled (along with the appropriate keyup/down events).
   * The input.Key.NULL key is encountered in the sequence. When this key is encountered, all
   * modifier keys current in the down state are released (with accompanying keyup events). The NULL
   * key can be used to simulate common keyboard shortcuts.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#sendKeys
   *
   * @param {string|string[]} value
   * @param {charByChar: boolean} options
   * @return {Promise<void>}
   */
  async type(value, options = { charByChar: false }) {
    if (options.charByChar) {
      for (const char of value) {
        await this._webElement.sendKeys(char);
        await delay(100);
      }
    } else {
      await this._webElement.sendKeys(...value);
    }
  }

  /**
   * Sends keyboard event into the element.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#sendKeys
   *
   * @param  {string|string[]} keys
   * @return {Promise<void>}
   */
  async pressKeys(...args) {
    let chord;
    //leadfoot compatibility
    if (Array.isArray(args[0])) {
      chord = this._Keys.chord(...args[0]);
    } else {
      chord = this._Keys.chord(...args);
    }

    await this._webElement.sendKeys(chord);
  }

  /**
   * Retrieves the current value of the given attribute of this element. Will return the current
   * value, even if it has been modified after the page has been loaded. More exactly, this method
   * will return the value of the given attribute, unless that attribute is not present, in which
   * case the value of the property with the same name is returned. If neither value is set, null
   * is returned (for example, the "value" property of a textarea element). The "style" attribute
   * is converted as best can be to a text representation with a trailing semi-colon.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#getAttribute
   *
   * @param {string} name
   */
  async getAttribute(name) {
    const rectAttributes = ['height', 'width', 'x', 'y'];
    if (rectAttributes.includes(name)) {
      const rect = await this.getSize();
      return rect[name];
    }
    return await this._webElement.getAttribute(name);
  }

  /**
   * Retrieves the current value of the given attribute of this element. Will return the current
   * value, even if it has been modified after the page has been loaded. More exactly, this method
   * will return the value of the given attribute, unless that attribute is not present, in which
   * case the value of the property with the same name is returned. If neither value is set, null
   * is returned (for example, the "value" property of a textarea element). The "style" attribute
   * is converted as best can be to a text representation with a trailing semi-colon.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#getAttribute
   *
   * @param {string} name
   * @return {Promise<any>}
   */
  async getProperty(name) {

    const property = await this._webElement.getAttribute(name);

    // leadfoot compatibility convertion
    if (property == null) {
      return false;
    }
    if (['true', 'false'].includes(property)) {
      return property === 'true';
    } else {
      return property;
    }
  }

  /**
   * Retrieves the value of a computed style property for this instance. If the element inherits
   * the named style from its parent, the parent will be queried for its value. Where possible,
   * color values will be converted to their hex representation (e.g. #00ff00 instead of rgb(0, 255, 0)).
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#getCssValue
   *
   * @param {string} propertyName
   * @return {Promise<string>}
   */
  async getComputedStyle(propertyName) {
    return await this._webElement.getCssValue(propertyName);
  }

  /**
   * Get the visible (i.e. not hidden by CSS) innerText of this element, including sub-elements,
   * without any leading or trailing whitespace.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#getText
   *
   * @return {Promise<string>}
   */
  async getVisibleText() {
    return await this._webElement.getText();
  }

  /**
   * Retrieves the element's tag name.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#getTagName
   *
   * @return {Promise<string>}
   */
  async getTagName() {
    return await this._webElement.getTagName();
  }

  /**
   * Returns an object describing an element's location, in pixels relative to the document element,
   * and the element's size in pixels.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#getRect
   *
   * @return {Promise<{height: number, width: number, x: number, y: number}>}
   */
  async getPosition() {
    return await this._webElement.getRect();
  }

  /**
   * Returns an object describing an element's location, in pixels relative to the document element,
   * and the element's size in pixels.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#getRect
   *
   * @return {Promise<{height: number, width: number, x: number, y: number}>}
   */
  async getSize() {
    return await this._webElement.getRect();
  }

  /**
   * Moves the remote environment’s mouse cursor to the current element
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/input_exports_Actions.html#move
   *
   * @return {Promise<void>}
   */
  async moveMouseTo() {
    await this.scrollIntoViewIfNecessary();
    const mouse = this._driver.actions().mouse();
    const actions = this._driver.actions({ bridge: true });
    await actions.pause(mouse).move({ origin: this._webElement }).perform();
  }

  /**
   * Gets the first element inside this element matching the given CSS selector.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#findElement
   *
   * @param {string} selector
   * @return {Promise<WebElementWrapper>}
   */
  async findByCssSelector(selector) {
    return this._wrap(await this._webElement.findElement(this._By.css(selector)));
  }

  /**
   * Gets all elements inside this element matching the given CSS selector.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#findElement
   *
   * @param {string} selector
   * @return {Promise<WebElementWrapper[]>}
   */
  async findAllByCssSelector(selector) {
    return this._wrapAll(await this._webElement.findElements(this._By.css(selector)));
  }

  /**
   * Gets the first element inside this element matching the given CSS class name.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#findElement
   *
   * @param {string} className
   * @return {Promise<WebElementWrapper>}
   */
  async findByClassName(className) {
    return this._wrap(await this._webElement.findElement(this._By.className(className)));
  }

  /**
   * Gets all elements inside this element matching the given CSS class name.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#findElement
   *
   * @param {string} className
   * @return {Promise<WebElementWrapper[]>}
   */
  async findAllByClassName(className) {
    return await this._wrapAll(
      await this._webElement.findElements(this._By.className(className))
    );
  }

  /**
   * Gets the first element inside this element matching the given tag name.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#findElement
   *
   * @param {string} tagName
   * @return {Promise<WebElementWrapper>}
   */
  async findByTagName(tagName) {
    return this._wrap(await this._webElement.findElement(this._By.tagName(tagName)));
  }

  /**
   * Gets all elements inside this element matching the given tag name.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#findElement
   *
   * @param {string} tagName
   * @return {Promise<WebElementWrapper[]>}
   */
  async findAllByTagName(tagName) {
    return await this._wrapAll(
      await this._webElement.findElements(this._By.tagName(tagName))
    );
  }

  /**
   * Gets the first element inside this element matching the given XPath selector.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#findElement
   *
   * @param {string} selector
   * @return {Promise<WebElementWrapper>}
   */
  async findByXpath(selector) {
    return this._wrap(await this._webElement.findElement(this._By.xpath(selector)));
  }

  /**
   * Gets all elements inside this element matching the given XPath selector.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#findElement
   *
   * @param {string} selector
   * @return {Promise<WebElementWrapper[]>}
   */
  async findAllByXpath(selector) {
    return await this._wrapAll(
      await this._webElement.findElements(this._By.xpath(selector))
    );
  }

  /**
   * Gets the first element inside this element matching the given partial link text.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#findElement
   *
   * @param {string} selector
   * @return {Promise<WebElementWrapper[]>}
   */
  async findByPartialLinkText(linkText) {
    return await this._wrap(await this._webElement.findElement(this._By.partialLinkText(linkText)));
  }

  /**
   * Gets all elements inside this element matching the given partial link text.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#findElement
   *
   * @param {string} selector
   * @return {Promise<WebElementWrapper[]>}
   */
  async findAllByPartialLinkText(linkText) {
    return await this._wrapAll(
      await this._webElement.findElements(this._By.partialLinkText(linkText))
    );
  }

  /**
   * Waits for all elements inside this element matching the given CSS selector to be destroyed.
   *
   * @param {string} className
   * @return {Promise<void>}
   */
  async waitForDeletedByCssSelector(selector) {
    await this._driver.manage().setTimeouts({ implicit: 1000 });
    await this._driver.wait(async () => {
      const found = await this._webElement.findElements(this._By.css(selector));
      return found.length === 0;
    },
    this._defaultFindTimeout,
    `The element with ${selector} selector was still present after ${this._defaultFindTimeout} sec.`);
    await this._driver.manage().setTimeouts({ implicit: this._defaultFindTimeout });
  }

  /**
   * Scroll the element into view, avoiding the fixed header if necessary
   *
   * @nonstandard
   * @return {Promise<void>}
   */
  async scrollIntoViewIfNecessary() {
    await this._driver.executeScript(scrollIntoViewIfNecessary, this._webElement, this._fixedHeaderHeight);
  }

  /**
   * Gets element innerHTML and wrap it up with cheerio
   *
   * @nonstandard
   * @return {Promise<void>}
   */
  async parseDomContent() {
    const htmlContent = await this.getProperty('innerHTML');
    const $ = cheerio.load(htmlContent, {
      normalizeWhitespace: true,
      xmlMode: true
    });

    $.findTestSubjects = function testSubjects(selector) {
      return this(testSubjSelector(selector));
    };

    $.fn.findTestSubjects = function testSubjects(selector) {
      return this.find(testSubjSelector(selector));
    };

    $.findTestSubject = $.fn.findTestSubject = function testSubjects(selector) {
      return this.findTestSubjects(selector).first();
    };

    return $;
  }

  /**
   * Creates the screenshot of the element
   *
   * @returns {Promise<void>}
   */
  async takeScreenshot() {
    const screenshot = await this._driver.takeScreenshot();
    const buffer = Buffer.from(screenshot.toString(), 'base64');
    const { width, height, x, y } = await this.getPosition();
    const src = PNG.sync.read(buffer);
    const dst = new PNG({ width, height });
    PNG.bitblt(src, dst, x, y, width, height, 0, 0);
    return PNG.sync.write(dst);
  }
}
