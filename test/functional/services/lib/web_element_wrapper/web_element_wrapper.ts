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

import { delay } from 'bluebird';
import { WebElement, WebDriver, By, IKey, until } from 'selenium-webdriver';
// @ts-ignore not supported yet
import { PNG } from 'pngjs';
// @ts-ignore not supported yet
import cheerio from 'cheerio';
import testSubjSelector from '@kbn/test-subj-selector';
import { ToolingLog } from '@kbn/dev-utils';
// @ts-ignore not supported yet
import { scrollIntoViewIfNecessary } from './scroll_into_view_if_necessary';
import { Browsers } from '../../remote/browsers';

interface Driver {
  driver: WebDriver;
  By: typeof By;
  Key: IKey;
  until: typeof until;
  LegacyActionSequence: any;
}

interface TypeOptions {
  charByChar: boolean;
}

export class WebElementWrapper {
  private By: typeof By = this.webDriver.By;
  private Keys: IKey = this.webDriver.Key;
  private driver: WebDriver = this.webDriver.driver;
  public _webElement: WebElement = this.webElement as WebElement;
  public LegacyAction: any = this.webDriver.LegacyActionSequence;

  constructor(
    private webElement: WebElementWrapper | WebElement,
    private webDriver: Driver,
    private timeout: number,
    private fixedHeaderHeight: number,
    private logger: ToolingLog,
    private browserType: string
  ) {
    if (webElement instanceof WebElementWrapper) {
      return webElement;
    }
  }

  private async _findWithCustomTimeout(
    findFunction: () => Promise<Array<WebElement | WebElementWrapper>>,
    timeout?: number
  ) {
    if (timeout && timeout !== this.timeout) {
      await (this.driver.manage() as any).setTimeouts({ implicit: timeout });
    }
    const elements = await findFunction();
    if (timeout && timeout !== this.timeout) {
      await (this.driver.manage() as any).setTimeouts({ implicit: this.timeout });
    }
    return elements;
  }

  private _wrap(otherWebElement: WebElement | WebElementWrapper) {
    return new WebElementWrapper(
      otherWebElement,
      this.webDriver,
      this.timeout,
      this.fixedHeaderHeight,
      this.logger,
      this.browserType
    );
  }

  private _wrapAll(otherWebElements: Array<WebElement | WebElementWrapper>) {
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
  public async isDisplayed(): Promise<boolean> {
    return await this._webElement.isDisplayed();
  }

  /**
   * Tests whether this element is enabled, as dictated by the disabled attribute.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#isEnabled
   *
   * @return {Promise<boolean>}
   */
  public async isEnabled(): Promise<boolean> {
    return await this._webElement.isEnabled();
  }

  /**
   * Tests whether this element is selected.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#isSelected
   *
   * @return {Promise<boolean>}
   */
  public async isSelected(): Promise<boolean> {
    return await this._webElement.isSelected();
  }

  /**
   * Clicks on this element.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#click
   *
   * @return {Promise<void>}
   */
  public async click(): Promise<void> {
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
    // https://bugs.chromium.org/p/chromedriver/issues/detail?id=2702
    // await this._webElement.clear();
    await this.driver.executeScript(`arguments[0].value=''`, this._webElement);
  }

  /**
   * Clear the value of this element using Keyboard
   * @param {{ charByChar: boolean }} options
   * @default { charByChar: false }
   */
  async clearValueWithKeyboard(options: TypeOptions = { charByChar: false }): Promise<void> {
    if (options.charByChar === true) {
      const value = await this.getAttribute('value');
      for (let i = 0; i <= value.length; i++) {
        await this.pressKeys(this.Keys.BACK_SPACE);
        await delay(100);
      }
    } else {
      if (this.browserType === Browsers.Chrome) {
        // https://bugs.chromium.org/p/chromedriver/issues/detail?id=30
        await this.driver.executeScript(`arguments[0].select();`, this._webElement);
        await this.pressKeys(this.Keys.BACK_SPACE);
      } else {
        const selectionKey = this.Keys[process.platform === 'darwin' ? 'COMMAND' : 'CONTROL'];
        await this.pressKeys([selectionKey, 'a']);
        await this.pressKeys(this.Keys.NULL); // Release modifier keys
        await this.pressKeys(this.Keys.BACK_SPACE); // Delete all content
      }
    }
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
  public async type(
    value: string | string[],
    options: TypeOptions = { charByChar: false }
  ): Promise<void> {
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
  public async pressKeys<T extends IKey>(keys: T | T[]): Promise<void>;
  public async pressKeys<T extends string>(keys: T | T[]): Promise<void>;
  public async pressKeys(keys: string): Promise<void> {
    if (Array.isArray(keys)) {
      const chord = this.Keys.chord(keys);
      await this._webElement.sendKeys(chord);
    } else {
      await this._webElement.sendKeys(keys);
    }
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
  public async getAttribute(name: string): Promise<string> {
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
  public async getProperty(name: string): Promise<string | boolean> {
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
  public async getComputedStyle(propertyName: string): Promise<string> {
    return await this._webElement.getCssValue(propertyName);
  }

  /**
   * Get the visible (i.e. not hidden by CSS) innerText of this element, including sub-elements,
   * without any leading or trailing whitespace.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#getText
   *
   * @return {Promise<string>}
   */
  public async getVisibleText(): Promise<string> {
    return await this._webElement.getText();
  }

  /**
   * Retrieves the element's tag name.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#getTagName
   *
   * @return {Promise<string>}
   */
  public async getTagName<T extends keyof HTMLElementTagNameMap>(): Promise<T>;
  public async getTagName<T extends string>(): Promise<T>;
  public async getTagName(): Promise<string> {
    return await this._webElement.getTagName();
  }

  /**
   * Returns an object describing an element's location, in pixels relative to the document element,
   * and the element's size in pixels.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#getRect
   *
   * @return {Promise<{height: number, width: number, x: number, y: number}>}
   */
  public async getPosition(): Promise<{ height: number; width: number; x: number; y: number }> {
    return await (this._webElement as any).getRect();
  }

  /**
   * Returns an object describing an element's location, in pixels relative to the document element,
   * and the element's size in pixels.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#getRect
   *
   * @return {Promise<{height: number, width: number, x: number, y: number}>}
   */
  public async getSize(): Promise<{ height: number; width: number; x: number; y: number }> {
    return await (this._webElement as any).getRect();
  }

  /**
   * Moves the remote environment’s mouse cursor to the current element
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/input_exports_Actions.html#move
   *
   * @return {Promise<void>}
   */
  public async moveMouseTo(): Promise<void> {
    await this.scrollIntoViewIfNecessary();
    if (this.browserType === Browsers.Firefox) {
      const actions = (this.driver as any).actions();
      await actions.move({ x: 0, y: 0 }).perform();
      await actions.move({ x: 10, y: 10, origin: this._webElement }).perform();
    } else {
      const mouse = (this.driver.actions() as any).mouse();
      const actions = (this.driver as any).actions({ bridge: true });
      await actions
        .pause(mouse)
        .move({ origin: this._webElement })
        .perform();
    }
  }

  /**
   * Gets the first element inside this element matching the given CSS selector.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#findElement
   *
   * @param {string} selector
   * @return {Promise<WebElementWrapper>}
   */
  public async findByCssSelector(selector: string): Promise<WebElementWrapper> {
    return this._wrap(await this._webElement.findElement(this.By.css(selector)));
  }

  /**
   * Gets all elements inside this element matching the given CSS selector.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#findElement
   *
   * @param {string} selector
   * @param {number} timeout
   * @return {Promise<WebElementWrapper[]>}
   */
  public async findAllByCssSelector(selector: string, timeout?: number) {
    return this._wrapAll(
      await this._findWithCustomTimeout(
        async () => await this._webElement.findElements(this.By.css(selector)),
        timeout
      )
    );
  }

  /**
   * Gets the first element inside this element matching the given CSS class name.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#findElement
   *
   * @param {string} className
   * @return {Promise<WebElementWrapper>}
   */
  public async findByClassName(className: string): Promise<WebElementWrapper> {
    return this._wrap(await this._webElement.findElement(this.By.className(className)));
  }

  /**
   * Gets all elements inside this element matching the given CSS class name.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#findElement
   *
   * @param {string} className
   * @param {number} timeout
   * @return {Promise<WebElementWrapper[]>}
   */
  public async findAllByClassName(
    className: string,
    timeout?: number
  ): Promise<WebElementWrapper[]> {
    return this._wrapAll(
      await this._findWithCustomTimeout(
        async () => await this._webElement.findElements(this.By.className(className)),
        timeout
      )
    );
  }

  /**
   * Gets the first element inside this element matching the given tag name.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#findElement
   *
   * @param {string} tagName
   * @return {Promise<WebElementWrapper>}
   */
  public async findByTagName<T extends keyof HTMLElementTagNameMap>(
    tagName: T
  ): Promise<WebElementWrapper>;
  public async findByTagName<T extends string>(tagName: T): Promise<WebElementWrapper>;
  public async findByTagName(tagName: string): Promise<WebElementWrapper> {
    return this._wrap(await this._webElement.findElement(this.By.tagName(tagName)));
  }

  /**
   * Gets all elements inside this element matching the given tag name.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#findElement
   *
   * @param {string} tagName
   * @param {number} timeout
   * @return {Promise<WebElementWrapper[]>}
   */
  public async findAllByTagName<T extends keyof HTMLElementTagNameMap>(
    tagName: T,
    timeout?: number
  ): Promise<WebElementWrapper[]>;
  public async findAllByTagName<T extends string>(
    tagName: T,
    timeout?: number
  ): Promise<WebElementWrapper[]>;
  public async findAllByTagName(tagName: string, timeout?: number): Promise<WebElementWrapper[]> {
    return this._wrapAll(
      await this._findWithCustomTimeout(
        async () => await this._webElement.findElements(this.By.tagName(tagName)),
        timeout
      )
    );
  }

  /**
   * Gets the first element inside this element matching the given XPath selector.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#findElement
   *
   * @param {string} selector
   * @return {Promise<WebElementWrapper>}
   */
  async findByXpath(selector: string): Promise<WebElementWrapper> {
    return this._wrap(await this._webElement.findElement(this.By.xpath(selector)));
  }

  /**
   * Gets all elements inside this element matching the given XPath selector.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#findElement
   *
   * @param {string} selector
   * @param {number} timeout
   * @return {Promise<WebElementWrapper[]>}
   */
  public async findAllByXpath(selector: string, timeout?: number): Promise<WebElementWrapper[]> {
    return this._wrapAll(
      await this._findWithCustomTimeout(
        async () => await this._webElement.findElements(this.By.xpath(selector)),
        timeout
      )
    );
  }

  /**
   * Gets the first element inside this element matching the given partial link text.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#findElement
   *
   * @param {string} selector
   * @return {Promise<WebElementWrapper[]>}
   */
  public async findByPartialLinkText(linkText: string): Promise<WebElementWrapper> {
    return await this._wrap(await this._webElement.findElement(this.By.partialLinkText(linkText)));
  }

  /**
   * Gets all elements inside this element matching the given partial link text.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#findElement
   *
   * @param {string} selector
   * @param {number} timeout
   * @return {Promise<WebElementWrapper[]>}
   */
  public async findAllByPartialLinkText(linkText: string, timeout?: number) {
    return this._wrapAll(
      await this._findWithCustomTimeout(
        async () => await this._webElement.findElements(this.By.partialLinkText(linkText)),
        timeout
      )
    );
  }

  /**
   * Waits for all elements inside this element matching the given CSS selector to be destroyed.
   *
   * @param {string} className
   * @return {Promise<void>}
   */
  public async waitForDeletedByCssSelector(selector: string): Promise<void> {
    await (this.driver.manage() as any).setTimeouts({ implicit: 1000 });
    await this.driver.wait(
      async () => {
        const found = await this._webElement.findElements(this.By.css(selector));
        return found.length === 0;
      },
      this.timeout,
      `The element with ${selector} selector was still present after ${this.timeout} sec.`
    );
    await (this.driver.manage() as any).setTimeouts({ implicit: this.timeout });
  }

  /**
   * Scroll the element into view, avoiding the fixed header if necessary
   *
   * @nonstandard
   * @return {Promise<void>}
   */
  public async scrollIntoViewIfNecessary(): Promise<void> {
    await this.driver.executeScript(
      scrollIntoViewIfNecessary,
      this._webElement,
      this.fixedHeaderHeight
    );
  }

  /**
   * Gets element innerHTML and wrap it up with cheerio
   *
   * @nonstandard
   * @return {Promise<void>}
   */
  public async parseDomContent(): Promise<any> {
    const htmlContent: any = await this.getProperty('innerHTML');
    const $: any = cheerio.load(htmlContent, {
      normalizeWhitespace: true,
      xmlMode: true,
    });

    $.findTestSubjects = function testSubjects(selector: string) {
      return this(testSubjSelector(selector));
    };

    $.fn.findTestSubjects = function testSubjects(selector: string) {
      return this.find(testSubjSelector(selector));
    };

    $.findTestSubject = $.fn.findTestSubject = function testSubjects(selector: string) {
      return this.findTestSubjects(selector).first();
    };

    return $;
  }

  /**
   * Creates the screenshot of the element
   *
   * @returns {Promise<void>}
   */
  public async takeScreenshot(): Promise<void> {
    const screenshot = await this.driver.takeScreenshot();
    const buffer = Buffer.from(screenshot.toString(), 'base64');
    const { width, height, x, y } = await this.getPosition();
    const src = PNG.sync.read(buffer);
    const dst = new PNG({ width, height });
    PNG.bitblt(src, dst, x, y, width, height, 0, 0);
    return PNG.sync.write(dst);
  }
}
