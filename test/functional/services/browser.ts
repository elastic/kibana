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

import { cloneDeep } from 'lodash';
import { Key, Origin } from 'selenium-webdriver';
// @ts-ignore internal modules are not typed
import { LegacyActionSequence } from 'selenium-webdriver/lib/actions';

import Jimp from 'jimp';
import { modifyUrl } from '../../../src/core/utils';
import { WebElementWrapper } from './lib/web_element_wrapper';
import { FtrProviderContext } from '../ftr_provider_context';
import { Browsers } from './remote/browsers';

export async function BrowserProvider({ getService }: FtrProviderContext) {
  const log = getService('log');
  const { driver, browserType } = await getService('__webdriver__').init();

  const isW3CEnabled = (driver as any).executor_.w3c === true;

  return new (class BrowserService {
    /**
     * Keyboard events
     */
    public readonly keys = Key;

    /**
     * Browser name
     */
    public readonly browserType: string = browserType;

    public readonly isChrome: boolean = browserType === Browsers.Chrome;

    public readonly isFirefox: boolean = browserType === Browsers.Firefox;

    public readonly isInternetExplorer: boolean = browserType === Browsers.InternetExplorer;

    /**
     * Is WebDriver instance W3C compatible
     */
    isW3CEnabled = isW3CEnabled;

    /**
     * Returns instance of Actions API based on driver w3c flag
     * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebDriver.html#actions
     */
    public getActions() {
      return this.isW3CEnabled ? driver.actions() : driver.actions({ bridge: true });
    }

    /**
     * Get handle for an alert, confirm, or prompt dialog. (if any).
     * @return {Promise<void>}
     */
    public async getAlert() {
      try {
        return await driver.switchTo().alert();
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
      return await driver
        .manage()
        .window()
        .getRect();
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
      await driver
        .manage()
        .window()
        .setRect({ width, height });
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
      log.debug(`======browser======== setWindowSize ${width} ${height}`);
      // We really want to set the Kibana app to a specific size without regard to the browser chrome (borders)
      // But that means we first need to figure out the display scaling factor.
      // NOTE: None of this is required when running Chrome headless because there's no scaling and no borders.
      await this.setWindowSize(1200, 800);
      const bitmap1 = await this.getScreenshotAsBitmap();
      log.debug(
        `======browser======== actual initial screenshot size width=${bitmap1.width}, height=${bitmap1.height}`
      );

      // drasticly change the window size so we can calculate the scaling
      await this.setWindowSize(600, 400);
      const bitmap2 = await this.getScreenshotAsBitmap();
      log.debug(
        `======browser======== actual second screenshot size width= ${bitmap2.width}, height=${bitmap2.height}`
      );

      const xScaling = (bitmap1.width - bitmap2.width) / 600;
      const yScaling = (bitmap1.height - bitmap2.height) / 400;
      const xBorder = Math.round(600 - bitmap2.width / xScaling);
      const yBorder = Math.round(400 - bitmap2.height / yScaling);
      log.debug(
        `======browser======== calculated values xBorder= ${xBorder}, yBorder=${yBorder}, xScaling=${xScaling}, yScaling=${yScaling}`
      );
      log.debug(
        `======browser======== setting browser size to ${width + xBorder} x ${height + yBorder}`
      );
      await this.setWindowSize(width + xBorder, height + yBorder);

      const bitmap3 = await this.getScreenshotAsBitmap();
      // when there is display scaling this won't show the expected size.  It will show expected size * scaling factor
      log.debug(
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
      let current: string;
      if (this.isInternetExplorer) {
        current = await driver.executeScript('return window.document.location.href');
      } else {
        current = await driver.getCurrentUrl();
      }
      const currentWithoutTime = modifyUrl(current, parsed => {
        delete (parsed.query as any)._t;
        return void 0;
      });
      return currentWithoutTime;
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
        const urlWithTime = modifyUrl(url, parsed => {
          (parsed.query as any)._t = Date.now();
          return void 0;
        });

        return await driver.get(urlWithTime);
      }
      return await driver.get(url);
    }

    /**
     * Pauses the execution in the browser, similar to setting a breakpoint for debugging.
     * @return {Promise<void>}
     */
    public async pause() {
      await driver.executeAsyncScript(`(async () => { debugger; return Promise.resolve(); })()`);
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
      if (this.isW3CEnabled) {
        await this.getActions()
          .move({ x: 0, y: 0 })
          .perform();
        await this.getActions()
          .move({ x: point.x, y: point.y, origin: Origin.POINTER })
          .perform();
      } else {
        await this.getActions()
          .pause(this.getActions().mouse)
          .move({ x: point.x, y: point.y, origin: Origin.POINTER })
          .perform();
      }
    }

    /**
     * Does a drag-and-drop action from one point to another
     * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/input_exports_Actions.html#dragAndDrop
     *
     * @param {{element: WebElementWrapper | {x: number, y: number}, offset: {x: number, y: number}}} from
     * @param {{element: WebElementWrapper | {x: number, y: number}, offset: {x: number, y: number}}} to
     * @return {Promise<void>}
     */
    public async dragAndDrop(
      from: { offset: { x: any; y: any }; location: any },
      to: { offset: { x: any; y: any }; location: any }
    ) {
      if (this.isW3CEnabled) {
        // The offset should be specified in pixels relative to the center of the element's bounding box
        const getW3CPoint = (data: any) => {
          if (!data.offset) {
            data.offset = {};
          }
          return data.location instanceof WebElementWrapper
            ? { x: data.offset.x || 0, y: data.offset.y || 0, origin: data.location._webElement }
            : { x: data.location.x, y: data.location.y, origin: Origin.POINTER };
        };

        const startPoint = getW3CPoint(from);
        const endPoint = getW3CPoint(to);
        await this.getActions()
          .move({ x: 0, y: 0 })
          .perform();
        return await this.getActions()
          .move(startPoint)
          .press()
          .move(endPoint)
          .release()
          .perform();
      } else {
        // The offset should be specified in pixels relative to the top-left corner of the element's bounding box
        const getOffset: any = (offset: { x: number; y: number }) =>
          offset ? { x: offset.x || 0, y: offset.y || 0 } : { x: 0, y: 0 };

        if (from.location instanceof WebElementWrapper === false) {
          throw new Error('Dragging point should be WebElementWrapper instance');
        } else if (typeof to.location.x === 'number') {
          return await this.getActions()
            .move({ origin: from.location._webElement })
            .press()
            .move({ x: to.location.x, y: to.location.y, origin: Origin.POINTER })
            .release()
            .perform();
        } else {
          return await new LegacyActionSequence(driver)
            .mouseMove(from.location._webElement, getOffset(from.offset))
            .mouseDown()
            .mouseMove(to.location._webElement, getOffset(to.offset))
            .mouseUp()
            .perform();
        }
      }
    }

    /**
     * Reloads the current browser window/frame.
     * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_Navigation.html#refresh
     *
     * @return {Promise<void>}
     */
    public async refresh() {
      await driver.navigate().refresh();
    }

    /**
     * Navigates the focused window/frame back one page using the browser’s navigation history.
     * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_Navigation.html#back
     *
     * @return {Promise<void>}
     */
    public async goBack() {
      await driver.navigate().back();
    }

    /**
     * Moves forwards in the browser history.
     * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_Navigation.html#forward
     */
    public async goForward() {
      await driver.navigate().forward();
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
      await this.getActions()
        .sendKeys(chord)
        .perform();
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
      if (this.isW3CEnabled) {
        await this.getActions()
          .move({ x: 0, y: 0 })
          .perform();
        await this.getActions()
          .move({ x: point.x, y: point.y, origin: Origin.POINTER })
          .click()
          .perform();
      } else {
        await this.getActions()
          .pause(this.getActions().mouse)
          .move({ x: point.x, y: point.y, origin: Origin.POINTER })
          .click()
          .perform();
      }
    }

    /**
     * Gets the HTML loaded in the focused window/frame. This markup is serialised by the remote
     * environment so may not exactly match the HTML provided by the Web server.
     * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebDriver.html#getPageSource
     *
     * @return {Promise<string>}
     */
    public async getPageSource() {
      return await driver.getPageSource();
    }

    /**
     * Gets a screenshot of the focused window and returns it as a base-64 encoded PNG
     * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebDriver.html#takeScreenshot
     *
     * @return {Promise<Buffer>}
     */
    public async takeScreenshot() {
      return await driver.takeScreenshot();
    }

    /**
     * Inserts action for performing a double left-click with the mouse.
     * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/input_exports_Actions.html#doubleClick
     * @param {WebElementWrapper} element
     * @return {Promise<void>}
     */
    public async doubleClick() {
      await this.getActions()
        .doubleClick()
        .perform();
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
      await driver.switchTo().window(nameOrHandle);
    }

    /**
     * Gets a list of identifiers for all currently open windows.
     * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebDriver.html#getAllWindowHandles
     *
     * @return {Promise<string[]>}
     */
    public async getAllWindowHandles() {
      return await driver.getAllWindowHandles();
    }

    /**
     * Sets a value in local storage for the focused window/frame.
     *
     * @param {string} key
     * @param {string} value
     * @return {Promise<void>}
     */
    public async setLocalStorageItem(key: string, value: string): Promise<void> {
      await driver.executeScript(
        'return window.localStorage.setItem(arguments[0], arguments[1]);',
        key,
        value
      );
    }

    /**
     * Clears session storage for the focused window/frame.
     *
     * @return {Promise<void>}
     */
    public async clearSessionStorage(): Promise<void> {
      await driver.executeScript('return window.sessionStorage.clear();');
    }

    /**
     * Closes the currently focused window. In most environments, after the window has been
     * closed, it is necessary to explicitly switch to whatever window is now focused.
     * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebDriver.html#close
     *
     * @return {Promise<void>}
     */
    public async closeCurrentWindow() {
      await driver.close();
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
      return await driver.executeScript(
        fn,
        ...cloneDeep<any>(args, arg => {
          if (arg instanceof WebElementWrapper) {
            return arg._webElement;
          }
        })
      );
    }

    public async executeAsync<R>(
      fn: string | ((...args: any[]) => Promise<R>),
      ...args: any[]
    ): Promise<R> {
      return await driver.executeAsyncScript(
        fn,
        ...cloneDeep<any>(args, arg => {
          if (arg instanceof WebElementWrapper) {
            return arg._webElement;
          }
        })
      );
    }

    public async getScrollTop() {
      const scrollSize = await driver.executeScript<string>('return document.body.scrollTop');
      return parseInt(scrollSize, 10);
    }

    public async getScrollLeft() {
      const scrollSize = await driver.executeScript<string>('return document.body.scrollLeft');
      return parseInt(scrollSize, 10);
    }

    // return promise with REAL scroll position
    public async setScrollTop(scrollSize: number | string) {
      await driver.executeScript('document.body.scrollTop = ' + scrollSize);
      return this.getScrollTop();
    }

    public async setScrollLeft(scrollSize: number | string) {
      await driver.executeScript('document.body.scrollLeft = ' + scrollSize);
      return this.getScrollLeft();
    }
  })();
}
