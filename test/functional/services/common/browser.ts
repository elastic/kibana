/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { setTimeout as setTimeoutAsync } from 'timers/promises';
import { cloneDeepWith } from 'lodash';
import { Key, Origin, WebDriver } from 'selenium-webdriver';
import { modifyUrl } from '@kbn/std';

import Jimp from 'jimp';
import { WebElementWrapper } from '../lib/web_element_wrapper';
import { FtrProviderContext, FtrService } from '../../ftr_provider_context';
import { Browsers } from '../remote/browsers';

export type Browser = BrowserService;

class BrowserService extends FtrService {
  /**
   * Keyboard events
   */
  public readonly keys = Key;
  public readonly isFirefox: boolean;
  public readonly isChromium: boolean;

  private readonly log = this.ctx.getService('log');

  constructor(
    ctx: FtrProviderContext,
    public readonly browserType: string,
    private readonly driver: WebDriver
  ) {
    super(ctx);
    this.isFirefox = this.browserType === Browsers.Firefox;
    this.isChromium =
      this.browserType === Browsers.Chrome || this.browserType === Browsers.ChromiumEdge;
  }

  /**
   * Returns instance of Actions API based on driver w3c flag
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebDriver.html#actions
   */
  public getActions() {
    return this.driver.actions();
  }

  /**
   * Get handle for an alert, confirm, or prompt dialog. (if any).
   * @return {Promise<void>}
   */
  public async getAlert() {
    try {
      return await this.driver.switchTo().alert();
    } catch (e) {
      return null;
    }
  }

  /**
   * Retrieves the a rect describing the current top-level window's size and position.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_Window.html
   *
   * @return {Promise<{height: number, width: number, x: number, y: number}>}
   */
  public async getWindowSize(): Promise<{ height: number; width: number; x: number; y: number }> {
    return await this.driver.manage().window().getRect();
  }

  /**
   * Sets the dimensions of a window.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_Window.html
   *
   * @param {number} width
   * @param {number} height
   * @return {Promise<void>}
   */
  public async setWindowSize(width: number, height: number) {
    await this.driver.manage().window().setRect({ width, height });
  }

  /**
   * Gets a screenshot of the focused window and returns it as a Bitmap object
   */
  public async getScreenshotAsBitmap() {
    const screenshot = await this.takeScreenshot();
    const buffer = Buffer.from(screenshot, 'base64');
    const session = (await Jimp.read(buffer)).clone();
    return session.bitmap;
  }

  /**
   * Sets the dimensions of a window to get the right size screenshot.
   *
   * @param {number} width
   * @param {number} height
   * @return {Promise<void>}
   */
  public async setScreenshotSize(width: number, height: number) {
    this.log.debug(`======browser======== setWindowSize ${width} ${height}`);
    // We really want to set the Kibana app to a specific size without regard to the browser chrome (borders)
    // But that means we first need to figure out the display scaling factor.
    // NOTE: None of this is required when running Chrome headless because there's no scaling and no borders.
    await this.setWindowSize(1200, 800);
    const bitmap1 = await this.getScreenshotAsBitmap();
    this.log.debug(
      `======browser======== actual initial screenshot size width=${bitmap1.width}, height=${bitmap1.height}`
    );

    // drasticly change the window size so we can calculate the scaling
    await this.setWindowSize(600, 400);
    const bitmap2 = await this.getScreenshotAsBitmap();
    this.log.debug(
      `======browser======== actual second screenshot size width= ${bitmap2.width}, height=${bitmap2.height}`
    );

    const xScaling = (bitmap1.width - bitmap2.width) / 600;
    const yScaling = (bitmap1.height - bitmap2.height) / 400;
    const xBorder = Math.round(600 - bitmap2.width / xScaling);
    const yBorder = Math.round(400 - bitmap2.height / yScaling);
    this.log.debug(
      `======browser======== calculated values xBorder= ${xBorder}, yBorder=${yBorder}, xScaling=${xScaling}, yScaling=${yScaling}`
    );
    this.log.debug(
      `======browser======== setting browser size to ${width + xBorder} x ${height + yBorder}`
    );
    await this.setWindowSize(width + xBorder, height + yBorder);

    const bitmap3 = await this.getScreenshotAsBitmap();
    // when there is display scaling this won't show the expected size.  It will show expected size * scaling factor
    this.log.debug(
      `======browser======== final screenshot size width=${bitmap3.width}, height=${bitmap3.height}`
    );
  }

  /**
   * Gets the URL that is loaded in the focused window/frame.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebDriver.html#getCurrentUrl
   *
   * @return {Promise<string>}
   */
  public async getCurrentUrl() {
    // strip _t=Date query param when url is read
    const current = await this.driver.getCurrentUrl();
    const currentWithoutTime = modifyUrl(current, (parsed) => {
      delete (parsed.query as any)._t;
      return void 0;
    });
    return currentWithoutTime;
  }

  /**
   * Gets the page/document title of the focused window/frame.
   * https://www.selenium.dev/selenium/docs/api/javascript/module/selenium-webdriver/chrome_exports_Driver.html#getTitle
   */
  public async getTitle() {
    return await this.driver.getTitle();
  }

  /**
   * Navigates the focused window/frame to a new URL.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/chrome_exports_Driver.html#get
   *
   * @param {string} url
   * @param {boolean} insertTimestamp Optional
   * @return {Promise<void>}
   */
  public async get(url: string, insertTimestamp: boolean = true) {
    if (insertTimestamp) {
      const urlWithTime = modifyUrl(url, (parsed) => {
        (parsed.query as any)._t = Date.now();
        return void 0;
      });

      return await this.driver.get(urlWithTime);
    }
    return await this.driver.get(url);
  }

  /**
   * Retrieves the cookie with the given name. Returns null if there is no such cookie. The cookie will be returned as
   * a JSON object as described by the WebDriver wire protocol.
   * https://www.selenium.dev/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_Options.html
   *
   * @param {string} cookieName
   * @return {Promise<IWebDriverCookie>}
   */
  public async getCookie(cookieName: string) {
    return await this.driver.manage().getCookie(cookieName);
  }

  /**
   * Pauses the execution in the browser, similar to setting a breakpoint for debugging.
   * @return {Promise<void>}
   */
  public async pause() {
    await this.driver.executeAsyncScript(`(async () => { debugger; return Promise.resolve(); })()`);
  }

  /**
   * Moves the remote environment’s mouse cursor to the specified point {x, y} which is
   * offset to browser page top left corner.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/input_exports_Actions.html#move
   *
   * @param {x: number, y: number} point on browser page
   * @return {Promise<void>}
   */
  public async moveMouseTo(point: { x: number; y: number }): Promise<void> {
    await this.getActions().move({ x: 0, y: 0 }).perform();
    await this.getActions().move({ x: point.x, y: point.y, origin: Origin.POINTER }).perform();
  }

  /**
   * Does a drag-and-drop action from one point to another
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/input_exports_Actions.html#dragAndDrop
   *
   * @return {Promise<void>}
   */
  public async dragAndDrop(
    from: {
      location: WebElementWrapper | { x?: number; y?: number };
      offset?: { x?: number; y?: number };
    },
    to: {
      location: WebElementWrapper | { x?: number; y?: number };
      offset?: { x?: number; y?: number };
    }
  ) {
    // The offset should be specified in pixels relative to the center of the element's bounding box
    const getW3CPoint = (data: any) => {
      if (!data.offset) {
        data.offset = {};
      }
      return data.location instanceof WebElementWrapper
        ? {
            x: data.offset.x || 0,
            y: data.offset.y || 0,
            origin: data.location._webElement,
          }
        : { x: data.location.x, y: data.location.y, origin: Origin.POINTER };
    };

    const startPoint = getW3CPoint(from);
    const endPoint = getW3CPoint(to);
    await this.getActions().move({ x: 0, y: 0 }).perform();
    return await this.getActions().move(startPoint).press().move(endPoint).release().perform();
  }

  /**
   * Performs drag and drop for html5 native drag and drop implementation
   * There's a bug in Chromedriver for html5 dnd that doesn't allow to use the method `dragAndDrop` defined above
   * https://github.com/SeleniumHQ/selenium/issues/6235
   * This implementation simulates user's action by calling the drag and drop specific events directly.
   *
   * @param {string} from html selector
   * @param {string} to html selector
   * @return {Promise<void>}
   */
  public async html5DragAndDrop(from: string, to: string) {
    await this.execute(
      `
        function createEvent(typeOfEvent) {
          const event = document.createEvent("CustomEvent");
          event.initCustomEvent(typeOfEvent, true, true, null);
          event.dataTransfer = {
            data: {},
            setData: function (key, value) {
              this.data[key] = value;
            },
            getData: function (key) {
              return this.data[key];
            }
          };
          return event;
        }
        function dispatchEvent(element, event, transferData) {
          if (transferData !== undefined) {
            event.dataTransfer = transferData;
          }
          if (element.dispatchEvent) {
            element.dispatchEvent(event);
          } else if (element.fireEvent) {
            element.fireEvent("on" + event.type, event);
          }
        }

        const origin = document.querySelector(arguments[0]);

        const dragStartEvent = createEvent('dragstart');
        dispatchEvent(origin, dragStartEvent);

        setTimeout(() => {
          const dropEvent = createEvent('drop');
          const target = document.querySelector(arguments[1]);
          dispatchEvent(target, dropEvent, dragStartEvent.dataTransfer);
          const dragEndEvent = createEvent('dragend');
          dispatchEvent(origin, dragEndEvent, dropEvent.dataTransfer);
        }, 100);
    `,
      from,
      to
    );
    // wait for 150ms to make sure the script has run
    await setTimeoutAsync(150);
  }

  /**
   * Reloads the current browser window/frame.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_Navigation.html#refresh
   *
   * @return {Promise<void>}
   */
  public async refresh() {
    await this.driver.navigate().refresh();
  }

  /**
   * Navigates the focused window/frame back one page using the browser’s navigation history.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_Navigation.html#back
   *
   * @return {Promise<void>}
   */
  public async goBack() {
    await this.driver.navigate().back();
  }

  /**
   * Moves forwards in the browser history.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_Navigation.html#forward
   *
   * @return {Promise<void>}
   */
  public async goForward() {
    await this.driver.navigate().forward();
  }

  /**
   * Navigates to a URL via the browser history.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_Navigation.html#to
   *
   * @return {Promise<void>}
   */
  public async navigateTo(url: string) {
    await this.driver.navigate().to(url);
  }

  /**
   * Sends a sequance of keyboard keys. For each key, this will record a pair of keyDown and keyUp actions
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/input_exports_Actions.html#sendKeys
   *
   * @param  {string|string[]} keys
   * @return {Promise<void>}
   */
  public async pressKeys(keys: string | string[]): Promise<void>;
  public async pressKeys(...args: string[]): Promise<void>;
  public async pressKeys(...args: string[]): Promise<void> {
    const chord = this.keys.chord(...args);
    await this.getActions().sendKeys(chord).perform();
  }

  /**
   * Moves the remote environment’s mouse cursor to the specified point {x, y} which is
   * offset to browser page top left corner.
   * Then adds an action for left-click (down/up) with the mouse.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/input_exports_Actions.html#click
   *
   * @param {x: number, y: number} point on browser page
   * @return {Promise<void>}
   */
  public async clickMouseButton(point: { x: number; y: number }) {
    await this.getActions().move({ x: 0, y: 0 }).perform();
    await this.getActions()
      .move({ x: point.x, y: point.y, origin: Origin.POINTER })
      .click()
      .perform();
  }

  /**
   * Gets the HTML loaded in the focused window/frame. This markup is serialised by the remote
   * environment so may not exactly match the HTML provided by the Web server.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebDriver.html#getPageSource
   *
   * @return {Promise<string>}
   */
  public async getPageSource() {
    return await this.driver.getPageSource();
  }

  /**
   * Gets a screenshot of the focused window and returns it as a base-64 encoded PNG
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebDriver.html#takeScreenshot
   *
   * @return {Promise<Buffer>}
   */
  public async takeScreenshot() {
    return await this.driver.takeScreenshot();
  }

  /**
   * Inserts action for performing a double left-click with the mouse.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/input_exports_Actions.html#doubleClick
   * @param {WebElementWrapper} element
   * @return {Promise<void>}
   */
  public async doubleClick() {
    await this.getActions().doubleClick().perform();
  }

  /**
   * Changes the focus of all future commands to another window. Windows may be specified
   * by their window.name attributeor by its handle (as returned by WebDriver#getWindowHandles).
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_TargetLocator.html
   *
   * @param {string} handle
   * @return {Promise<void>}
   */
  public async switchToWindow(nameOrHandle: string) {
    await this.driver.switchTo().window(nameOrHandle);
  }

  /**
   * Gets a list of identifiers for all currently open windows.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebDriver.html#getAllWindowHandles
   *
   * @return {Promise<string[]>}
   */
  public async getAllWindowHandles() {
    return await this.driver.getAllWindowHandles();
  }

  /**
   * Switches driver to specific browser tab by index
   *
   * @param {string} tabIndex
   * @return {Promise<void>}
   */
  public async switchTab(tabIndex: number) {
    const tabs = await this.driver.getAllWindowHandles();
    if (tabs.length <= tabIndex) {
      throw new Error(`Out of existing tabs bounds`);
    }
    await this.driver.switchTo().window(tabs[tabIndex]);
  }

  /**
   * Sets a value in local storage for the focused window/frame.
   *
   * @param {string} key
   * @param {string} value
   * @return {Promise<void>}
   */
  public async setLocalStorageItem(key: string, value: string): Promise<void> {
    await this.driver.executeScript(
      'return window.localStorage.setItem(arguments[0], arguments[1]);',
      key,
      value
    );
  }

  /**
   * Removes a value in local storage for the focused window/frame.
   *
   * @param {string} key
   * @return {Promise<void>}
   */
  public async removeLocalStorageItem(key: string): Promise<void> {
    await this.driver.executeScript('return window.localStorage.removeItem(arguments[0]);', key);
  }

  /**
   * Clears all values in local storage for the focused window/frame.
   *
   * @return {Promise<void>}
   */
  public async clearLocalStorage(): Promise<void> {
    await this.driver.executeScript('return window.localStorage.clear();');
  }

  /**
   * Clears session storage for the focused window/frame.
   *
   * @return {Promise<void>}
   */
  public async clearSessionStorage(): Promise<void> {
    await this.driver.executeScript('return window.sessionStorage.clear();');
  }

  /**
   * Closes the currently focused window. In most environments, after the window has been
   * closed, it is necessary to explicitly switch to whatever window is now focused.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebDriver.html#close
   *
   * @return {Promise<void>}
   */
  public async closeCurrentWindow() {
    await this.driver.close();
  }

  /**
   * Executes JavaScript code within the focused window/frame. The code should return a value synchronously.
   * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebDriver.html#executeScript
   *
   * @param  {string|function} fn
   * @param  {...any[]} args
   */
  public async execute<A extends any[], R>(
    fn: string | ((...args: A) => R),
    ...args: A
  ): Promise<R> {
    return await this.driver.executeScript(
      fn,
      ...cloneDeepWith<any>(args, (arg) => {
        if (arg instanceof WebElementWrapper) {
          return arg._webElement;
        }
      })
    );
  }

  public async executeAsync<T = unknown>(fn: (cb: (value?: T) => void) => void): Promise<T>;
  public async executeAsync<T = unknown, A1 = unknown>(
    fn: (a1: A1, cb: (value?: T) => void) => void,
    a1: A1
  ): Promise<T>;
  public async executeAsync<T = unknown, A1 = unknown, A2 = unknown>(
    fn: (a1: A1, a2: A2, cb: (value?: T) => void) => void,
    a1: A1,
    a2: A2
  ): Promise<T>;
  public async executeAsync<T = unknown, A1 = unknown, A2 = unknown, A3 = unknown>(
    fn: (a1: A1, a2: A2, a3: A3, cb: (value?: T) => void) => void,
    a1: A1,
    a2: A2,
    a3: A3
  ): Promise<T>;
  public async executeAsync<T = unknown>(fn: (...args: any[]) => void, ...args: any[]): Promise<T> {
    return await this.driver.executeAsyncScript<T>(
      fn,
      ...cloneDeepWith<any>(args, (arg) => {
        if (arg instanceof WebElementWrapper) {
          return arg._webElement;
        }
      })
    );
  }

  public async getScrollTop() {
    const scrollSize = await this.driver.executeScript<string>('return document.body.scrollTop');
    return parseInt(scrollSize, 10);
  }

  public async getScrollLeft() {
    const scrollSize = await this.driver.executeScript<string>('return document.body.scrollLeft');
    return parseInt(scrollSize, 10);
  }

  public async scrollTop() {
    await this.driver.executeScript('document.documentElement.scrollTop = 0');
  }

  // return promise with REAL scroll position
  public async setScrollTop(scrollSize: number | string) {
    await this.driver.executeScript('document.body.scrollTop = ' + scrollSize);
    return this.getScrollTop();
  }

  public async setScrollToById(elementId: string, xCoord: number, yCoord: number) {
    await this.driver.executeScript(
      `document.getElementById("${elementId}").scrollTo(${xCoord},${yCoord})`
    );
  }

  public async setScrollLeft(scrollSize: number | string) {
    await this.driver.executeScript('document.body.scrollLeft = ' + scrollSize);
    return this.getScrollLeft();
  }

  public async switchToFrame(idOrElement: number | WebElementWrapper) {
    const _id = idOrElement instanceof WebElementWrapper ? idOrElement._webElement : idOrElement;
    await this.driver.switchTo().frame(_id);
  }

  public async checkBrowserPermission(permission: string): Promise<boolean> {
    const result: any = await this.driver.executeAsyncScript(
      `navigator.permissions.query({name:'${permission}'}).then(arguments[0])`
    );

    return Boolean(result?.state === 'granted');
  }

  public getClipboardValue(): Promise<string> {
    return this.driver.executeAsyncScript('navigator.clipboard.readText().then(arguments[0])');
  }
}

export async function BrowserProvider(ctx: FtrProviderContext) {
  const { driver, browserType } = await ctx.getService('__webdriver__').init();
  return new BrowserService(ctx, browserType, driver);
}
