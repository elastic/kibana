/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { setTimeout as setTimeoutAsync } from 'timers/promises';
import { WebElement, WebDriver, By, Key } from 'selenium-webdriver';
import { PNG } from 'pngjs';
import cheerio from 'cheerio';
import testSubjSelector from '@kbn/test-subj-selector';
import { ToolingLog } from '@kbn/dev-utils';
import { CustomCheerio, CustomCheerioStatic } from './custom_cheerio_api';
// @ts-ignore not supported yet
import { scrollIntoViewIfNecessary } from './scroll_into_view_if_necessary';
import { Browsers } from '../../remote/browsers';

interface TypeOptions {
  charByChar: boolean;
}

interface ClearOptions {
  withJS: boolean;
}

const RETRY_CLICK_MAX_ATTEMPTS = 3;
const RETRY_CLICK_RETRY_ON_ERRORS = [
  'ElementClickInterceptedError',
  'ElementNotInteractableError',
  'StaleElementReferenceError',
];

export class WebElementWrapper {
  private By = By;
  private Keys = Key;
  public isChromium: boolean;

  public static create(
    webElement: WebElement | WebElementWrapper,
    locator: By | null,
    driver: WebDriver,
    timeout: number,
    fixedHeaderHeight: number,
    logger: ToolingLog,
    browserType: Browsers
  ): WebElementWrapper {
    if (webElement instanceof WebElementWrapper) {
      return webElement;
    }

    return new WebElementWrapper(
      webElement,
      locator,
      driver,
      timeout,
      fixedHeaderHeight,
      logger,
      browserType
    );
  }

  constructor(
    public _webElement: WebElement,
    private locator: By | null,
    private driver: WebDriver,
    private timeout: number,
    private fixedHeaderHeight: number,
    private logger: ToolingLog,
    private browserType: Browsers
  ) {
    this.isChromium = [Browsers.Chrome, Browsers.ChromiumEdge].includes(this.browserType);
  }

  private async _findWithCustomTimeout(
    findFunction: () => Promise<Array<WebElement | WebElementWrapper>>,
    timeout?: number
  ) {
    if (timeout && timeout !== this.timeout) {
      await this.driver.manage().setTimeouts({ implicit: timeout });
    }
    const elements = await findFunction();
    if (timeout && timeout !== this.timeout) {
      await this.driver.manage().setTimeouts({ implicit: this.timeout });
    }
    return elements;
  }

  private _wrap(otherWebElement: WebElement | WebElementWrapper, locator: By | null = null) {
    return WebElementWrapper.create(
      otherWebElement,
      locator,
      this.driver,
      this.timeout,
      this.fixedHeaderHeight,
      this.logger,
      this.browserType
    );
  }

  private _wrapAll(otherWebElements: Array<WebElement | WebElementWrapper>) {
    return otherWebElements.map((e) => this._wrap(e));
  }

  private async retryCall<T>(
    fn: (wrapper: this) => T | Promise<T>,
    attemptsRemaining: number = RETRY_CLICK_MAX_ATTEMPTS
  ): Promise<T> {
    try {
      return await fn(this);
    } catch (err) {
      if (
        !RETRY_CLICK_RETRY_ON_ERRORS.includes(err.name) ||
        this.locator === null ||
        attemptsRemaining === 0
      ) {
        throw err;
      }

      this.logger.warning(`WebElementWrapper.${fn.name}: ${err.message}`);
      this.logger.debug(
        `finding element '${this.locator.toString()}' again, ${attemptsRemaining - 1} attempts left`
      );

      await setTimeoutAsync(200);
      this._webElement = await this.driver.findElement(this.locator);
      return await this.retryCall(fn, attemptsRemaining - 1);
    }
  }

  private getActions() {
    return this.driver.actions();
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
  public async isDisplayed() {
    return await this.retryCall(async function isDisplayed(wrapper) {
      return await wrapper._webElement.isDisplayed();
    });
  }

  /**
   * Tests whether this element is enabled, as dictated by the disabled attribute.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#isEnabled
   *
   * @return {Promise<boolean>}
   */
  public async isEnabled() {
    return await this.retryCall(async function isEnabled(wrapper) {
      return await wrapper._webElement.isEnabled();
    });
  }

  /**
   * Tests whether this element is selected.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#isSelected
   *
   * @return {Promise<boolean>}
   */
  public async isSelected() {
    return await this.retryCall(async function isSelected(wrapper) {
      return await wrapper._webElement.isSelected();
    });
  }

  /**
   * Clicks on this element.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#click
   *
   * @return {Promise<void>}
   */
  public async click(topOffset?: number) {
    await this.retryCall(async function click(wrapper) {
      await wrapper.scrollIntoViewIfNecessary(topOffset);
      await wrapper._webElement.click();
    });
  }

  /**
   * Clicks on this element, with the specified number of retries.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#click
   *
   * @return {Promise<void>}
   */
  public async clickWithRetries(retries: number, topOffset?: number) {
    await this.retryCall(async function click(wrapper) {
      await wrapper.scrollIntoViewIfNecessary(topOffset);
      await wrapper._webElement.click();
    }, retries);
  }

  /**
   * Focuses this element.
   *
   * @return {Promise<void>}
   */
  public async focus() {
    await this.retryCall(async function focus(wrapper) {
      await wrapper.scrollIntoViewIfNecessary();
      await wrapper.driver.executeScript(`arguments[0].focus()`, wrapper._webElement);
    });
  }

  /**
   * If possible, opens 'href' of this element directly through the URL
   *
   * @return {Promise<void>}
   */
  public async openHref() {
    const href = await this.getAttribute('href');
    if (href) {
      await this.driver.get(href);
    }
  }

  /**
   * Check if webelement wrapper has a specific class.
   *
   * @return {Promise<boolean>}
   */
  public async elementHasClass(className: string): Promise<boolean> {
    const classes: string = await this._webElement.getAttribute('class');

    return classes.includes(className);
  }

  /**
   * Clear the value of this element. This command has no effect if the underlying DOM element
   * is neither a text INPUT element nor a TEXTAREA element.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#clear
   *
   * @param {{ withJS: boolean }} options option to clear input with JS: `arguments[0].value=''`
   * @default { withJS: false }
   */
  async clearValue(options: ClearOptions = { withJS: false }) {
    await this.retryCall(async function clearValue(wrapper) {
      if (wrapper.isChromium || options.withJS) {
        // https://bugs.chromium.org/p/chromedriver/issues/detail?id=2702
        await wrapper.driver.executeScript(`arguments[0].value=''`, wrapper._webElement);
      } else {
        await wrapper._webElement.clear();
      }
    });
  }

  /**
   * Clear the value of this element using Keyboard
   * @param {{ charByChar: boolean }} options to input characters one by one
   * @default { charByChar: false }
   */
  async clearValueWithKeyboard(options: TypeOptions = { charByChar: false }) {
    if (options.charByChar === true) {
      const value = await this.getAttribute('value');
      for (let i = 0; i <= value.length; i++) {
        await this.pressKeys(this.Keys.BACK_SPACE);
        await setTimeoutAsync(100);
      }
    } else {
      if (this.isChromium) {
        // https://bugs.chromium.org/p/chromedriver/issues/detail?id=30
        await this.retryCall(async function clearValueWithKeyboard(wrapper) {
          await wrapper.driver.executeScript(`arguments[0].select();`, wrapper._webElement);
        });
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
  public async type(value: string | string[], options: TypeOptions = { charByChar: false }) {
    if (options.charByChar) {
      for (const char of value) {
        await this.retryCall(async function type(wrapper) {
          await wrapper._webElement.sendKeys(char);
          await setTimeoutAsync(100);
        });
      }
    } else {
      await this.retryCall(async function type(wrapper) {
        await wrapper._webElement.sendKeys(...value);
      });
    }
  }

  /**
   * Sends keyboard event into the element.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#sendKeys
   *
   * @param  {string|string[]} keys
   * @return {Promise<void>}
   */
  public async pressKeys<T extends typeof Key>(keys: T | T[]): Promise<void>;
  public async pressKeys<T extends string>(keys: T | T[]): Promise<void>;
  public async pressKeys(keys: string): Promise<void> {
    await this.retryCall(async function pressKeys(wrapper) {
      if (Array.isArray(keys)) {
        const chord = wrapper.Keys.chord(keys);
        await wrapper._webElement.sendKeys(chord);
      } else {
        await wrapper._webElement.sendKeys(keys);
      }
    });
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
  public async getAttribute(name: string) {
    return await this.retryCall(async function getAttribute(wrapper) {
      return await wrapper._webElement.getAttribute(name);
    });
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
  public async getComputedStyle(propertyName: string) {
    return await this.retryCall(async function getComputedStyle(wrapper) {
      return await wrapper._webElement.getCssValue(propertyName);
    });
  }

  /**
   * Get the visible (i.e. not hidden by CSS) innerText of this element, including sub-elements,
   * without any leading or trailing whitespace.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#getText
   *
   * @return {Promise<string>}
   */
  public async getVisibleText() {
    return await this.retryCall(async function getVisibleText(wrapper) {
      return await wrapper._webElement.getText();
    });
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
    return await this.retryCall(async function getTagName(wrapper) {
      return await wrapper._webElement.getTagName();
    });
  }

  /**
   * Returns an object describing an element's location, in pixels relative to the document element,
   * and the element's size in pixels.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#getRect
   *
   * @return {Promise<{height: number, width: number, x: number, y: number}>}
   */
  public async getPosition(): Promise<{ height: number; width: number; x: number; y: number }> {
    return await this.retryCall(async function getPosition(wrapper) {
      return await wrapper._webElement.getRect();
    });
  }

  /**
   * Returns an object describing an element's location, in pixels relative to the document element,
   * and the element's size in pixels.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#getRect
   *
   * @return {Promise<{height: number, width: number, x: number, y: number}>}
   */
  public async getSize(): Promise<{ height: number; width: number; x: number; y: number }> {
    return await this.retryCall(async function getSize(wrapper) {
      return await wrapper._webElement.getRect();
    });
  }

  /**
   * Moves the remote environment’s mouse cursor to the current element with optional offset
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/input_exports_Actions.html#move
   * @param { xOffset: 0, yOffset: 0 } options
   * @return {Promise<void>}
   */
  public async moveMouseTo(options = { xOffset: 0, yOffset: 0 }) {
    await this.retryCall(async function moveMouseTo(wrapper) {
      await wrapper.scrollIntoViewIfNecessary();
      await wrapper.getActions().move({ x: 0, y: 0 }).perform();
      await wrapper
        .getActions()
        .move({ x: options.xOffset, y: options.yOffset, origin: wrapper._webElement })
        .perform();
    });
  }

  /**
   * Inserts an action for moving the mouse to element center, unless optional offset is provided.
   * Then adds an action for left-click (down/up) with the mouse.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/input_exports_Actions.html#click
   *
   * @param { xOffset: 0, yOffset: 0 } options Optional
   * @return {Promise<void>}
   */
  public async clickMouseButton(options = { xOffset: 0, yOffset: 0 }) {
    await this.retryCall(async function clickMouseButton(wrapper) {
      await wrapper.scrollIntoViewIfNecessary();
      await wrapper.getActions().move({ x: 0, y: 0 }).perform();
      await wrapper
        .getActions()
        .move({ x: options.xOffset, y: options.yOffset, origin: wrapper._webElement })
        .click()
        .perform();
    });
  }

  /**
   * Inserts action for performing a double left-click with the mouse.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/input_exports_Actions.html#doubleClick
   * @param {WebElementWrapper} element
   * @return {Promise<void>}
   */
  public async doubleClick() {
    await this.retryCall(async function clickMouseButton(wrapper) {
      await wrapper.scrollIntoViewIfNecessary();
      await wrapper.getActions().doubleClick(wrapper._webElement).perform();
    });
  }

  /**
   * Gets the first element inside this element matching the given CSS selector.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#findElement
   *
   * @param {string} selector
   * @return {Promise<WebElementWrapper>}
   */
  public async findByCssSelector(selector: string) {
    return await this.retryCall(async function findByCssSelector(wrapper) {
      return wrapper._wrap(
        await wrapper._webElement.findElement(wrapper.By.css(selector)),
        wrapper.By.css(selector)
      );
    });
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
    return await this.retryCall(async function findAllByCssSelector(wrapper) {
      return wrapper._wrapAll(
        await wrapper._findWithCustomTimeout(
          async () => await wrapper._webElement.findElements(wrapper.By.css(selector)),
          timeout
        )
      );
    });
  }

  /**
   * Gets the first element inside this element matching the given data-test-subj selector.
   *
   * @param {string} selector
   * @return {Promise<WebElementWrapper>}
   */
  public async findByTestSubject(selector: string) {
    return await this.retryCall(async function find(wrapper) {
      return wrapper._wrap(
        await wrapper._webElement.findElement(wrapper.By.css(testSubjSelector(selector)))
      );
    });
  }

  /**
   * Gets all elements inside this element matching the given data-test-subj selector.
   *
   * @param {string} selector
   * @param {number} timeout
   * @return {Promise<WebElementWrapper[]>}
   */
  public async findAllByTestSubject(selector: string, timeout?: number) {
    return await this.retryCall(async function findAll(wrapper) {
      return wrapper._wrapAll(
        await wrapper._findWithCustomTimeout(
          async () =>
            await wrapper._webElement.findElements(wrapper.By.css(testSubjSelector(selector))),
          timeout
        )
      );
    });
  }

  /**
   * Gets the first element inside this element matching the given CSS class name.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#findElement
   *
   * @param {string} className
   * @return {Promise<WebElementWrapper>}
   */
  public async findByClassName(className: string) {
    return await this.retryCall(async function findByClassName(wrapper) {
      return wrapper._wrap(
        await wrapper._webElement.findElement(wrapper.By.className(className)),
        wrapper.By.className(className)
      );
    });
  }

  /**
   * Gets all elements inside this element matching the given CSS class name.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#findElement
   *
   * @param {string} className
   * @param {number} timeout
   * @return {Promise<WebElementWrapper[]>}
   */
  public async findAllByClassName(className: string, timeout?: number) {
    return await this.retryCall(async function findAllByClassName(wrapper) {
      return wrapper._wrapAll(
        await wrapper._findWithCustomTimeout(
          async () => await wrapper._webElement.findElements(wrapper.By.className(className)),
          timeout
        )
      );
    });
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
    return await this.retryCall(async function findByTagName(wrapper) {
      return wrapper._wrap(
        await wrapper._webElement.findElement(wrapper.By.tagName(tagName)),
        wrapper.By.tagName(tagName)
      );
    });
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
    return await this.retryCall(async function findAllByTagName(wrapper) {
      return wrapper._wrapAll(
        await wrapper._findWithCustomTimeout(
          async () => await wrapper._webElement.findElements(wrapper.By.tagName(tagName)),
          timeout
        )
      );
    });
  }

  /**
   * Gets the first element inside this element matching the given XPath selector.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#findElement
   *
   * @param {string} selector
   * @return {Promise<WebElementWrapper>}
   */
  async findByXpath(selector: string) {
    return await this.retryCall(async function findByXpath(wrapper) {
      return wrapper._wrap(
        await wrapper._webElement.findElement(wrapper.By.xpath(selector)),
        wrapper.By.xpath(selector)
      );
    });
  }

  /**
   * Gets all elements inside this element matching the given XPath selector.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#findElement
   *
   * @param {string} selector
   * @param {number} timeout
   * @return {Promise<WebElementWrapper[]>}
   */
  public async findAllByXpath(selector: string, timeout?: number) {
    return await this.retryCall(async function findAllByXpath(wrapper) {
      return wrapper._wrapAll(
        await wrapper._findWithCustomTimeout(
          async () => await wrapper._webElement.findElements(wrapper.By.xpath(selector)),
          timeout
        )
      );
    });
  }

  /**
   * Gets the first element inside this element matching the given partial link text.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#findElement
   *
   * @param {string} linkText
   * @return {Promise<WebElementWrapper[]>}
   */
  public async findByPartialLinkText(linkText: string) {
    return await this.retryCall(async function findByPartialLinkText(wrapper) {
      return wrapper._wrap(
        await wrapper._webElement.findElement(wrapper.By.partialLinkText(linkText)),
        wrapper.By.partialLinkText(linkText)
      );
    });
  }

  /**
   * Gets all elements inside this element matching the given partial link text.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebElement.html#findElement
   *
   * @param {string} linkText
   * @param {number} timeout
   * @return {Promise<WebElementWrapper[]>}
   */
  public async findAllByPartialLinkText(linkText: string, timeout?: number) {
    return await this.retryCall(async function findAllByPartialLinkText(
      wrapper: WebElementWrapper
    ) {
      return wrapper._wrapAll(
        await wrapper._findWithCustomTimeout(
          async () => await wrapper._webElement.findElements(wrapper.By.partialLinkText(linkText)),
          timeout
        )
      );
    });
  }

  /**
   * Waits for all elements inside this element matching the given CSS selector to be destroyed.
   *
   * @param {string} className
   * @return {Promise<void>}
   */
  public async waitForDeletedByCssSelector(selector: string): Promise<void> {
    await this.driver.manage().setTimeouts({ implicit: 1000 });
    await this.driver.wait(
      async () => {
        const found = await this._webElement.findElements(this.By.css(selector));
        return found.length === 0;
      },
      this.timeout,
      `The element with ${selector} selector was still present after ${this.timeout} sec.`
    );
    await this.driver.manage().setTimeouts({ implicit: this.timeout });
  }

  /**
   * Scroll the element into view, avoiding the fixed header if necessary
   *
   * @nonstandard
   * @return {Promise<void>}
   */
  public async scrollIntoViewIfNecessary(
    topOffsetOrOptions?: number | { topOffset?: number; bottomOffset?: number }
  ): Promise<void> {
    let topOffset: undefined | number;
    let bottomOffset: undefined | number;
    if (typeof topOffsetOrOptions === 'number') {
      topOffset = topOffsetOrOptions;
    } else {
      topOffset = topOffsetOrOptions?.topOffset;
      bottomOffset = topOffsetOrOptions?.bottomOffset;
    }
    await this.driver.executeScript(
      scrollIntoViewIfNecessary,
      this._webElement,
      topOffset || this.fixedHeaderHeight,
      bottomOffset
    );
  }

  /**
   * Gets element innerHTML and wrap it up with cheerio
   *
   * @nonstandard
   * @return {Promise<CustomCheerioStatic>}
   */
  public async parseDomContent(): Promise<CustomCheerioStatic> {
    const htmlContent: any = await this.getAttribute('innerHTML');
    const $: any = cheerio.load(htmlContent, {
      normalizeWhitespace: true,
      xmlMode: true,
    });

    $.findTestSubjects = function findTestSubjects(this: CustomCheerioStatic, selector: string) {
      return this(testSubjSelector(selector));
    };

    $.fn.findTestSubjects = function findTestSubjects(this: CustomCheerio, selector: string) {
      return this.find(testSubjSelector(selector));
    };

    $.findTestSubject = function findTestSubject(this: CustomCheerioStatic, selector: string) {
      return this.findTestSubjects(selector).first();
    };

    $.fn.findTestSubject = function findTestSubject(this: CustomCheerio, selector: string) {
      return this.findTestSubjects(selector).first();
    };

    return $;
  }

  /**
   * Creates the screenshot of the element
   *
   * @returns {Promise<void>}
   */
  public async takeScreenshot(): Promise<Buffer> {
    const screenshot = await this.driver.takeScreenshot();
    const buffer = Buffer.from(screenshot, 'base64');
    const { width, height, x, y } = await this.getPosition();
    const windowWidth: number = await this.driver.executeScript(
      'return window.document.body.clientWidth'
    );
    const src = PNG.sync.read(buffer);
    if (src.width > windowWidth) {
      // on linux size of screenshot is double size of screen, scale it down
      src.width = src.width / 2;
      src.height = src.height / 2;
      let h = false;
      let v = false;
      const filteredData = src.data.filter((d: any, i: number) => {
        h = i % 4 ? h : !h;
        v = i % (src.width * 2 * 4) ? v : !v;
        return h && v;
      });
      src.data = Buffer.from(filteredData);
    }
    const dst = new PNG({ width, height });
    PNG.bitblt(src, dst, x, y, width, height, 0, 0);
    return PNG.sync.write(dst);
  }
}
