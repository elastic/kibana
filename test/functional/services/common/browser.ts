/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { delay } from 'bluebird';
import { cloneDeepWith } from 'lodash';
import { ProvidedType } from '@kbn/test/types/ftr';
import { modifyUrl } from '@kbn/std';

import Jimp from 'jimp';
import { WebElementWrapper } from '../lib/web_element_wrapper';
import { FtrProviderContext } from '../../ftr_provider_context';
import { Browsers } from '../remote/browsers';

export type Browser = ProvidedType<typeof BrowserProvider>;
export async function BrowserProvider({ getService }: FtrProviderContext) {
  const log = getService('log');
  const { driver, browserType } = await getService('__webdriver__').init();

  return new (class BrowserService {
    /**
     * Browser name
     */
    public readonly browserType: string = browserType;

    public readonly isChromium: boolean = [Browsers.Chrome, Browsers.ChromiumEdge].includes(
      browserType
    );

    public readonly isFirefox: boolean = browserType === Browsers.Firefox;

    // https://w3c.github.io/webdriver/#keyboard-actions
    public readonly keys = {
      ESCAPE: 'Escape',
      ENTER: 'Enter',
      DELETE: 'Delete',
      TAB: 'Tab',
      BACK_SPACE: 'Backspace',
      RETURN: 'Return',
      ARROW_LEFT: 'ArrowLeft',
      ARROW_RIGHT: 'ArrowRight',
      ARROW_UP: 'ArrowUp',
      ARROW_DOWN: 'ArrowDown',
      PAGE_UP: 'PageUp',
      PAGE_DOWN: 'PageDown',
    };

    /**
     * Retrieves the a rect describing the current top-level window's size and position.
     * https://webdriver.io/docs/api/browser/getWindowSize.html
     *
     * @return {Promise<{height: number, width: number, x: number, y: number}>}
     */
    public async getWindowSize(): Promise<{ height: number; width: number; x: number; y: number }> {
      return await driver.getWindowSize();
    }

    /**
     * Sets the dimensions of a window.
     * https://webdriver.io/docs/api/webdriver.html#setwindowrect
     *
     * @param {number} width
     * @param {number} height
     * @return {Promise<void>}
     */
    public async setWindowSize(width: number, height: number) {
      await driver.setWindowRect(null, null, width, height);
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
     * https://webdriver.io/docs/api/webdriver.html#geturl
     *
     * @return {Promise<string>}
     */
    public async getCurrentUrl() {
      // strip _t=Date query param when url is read
      const current = await driver.getUrl();
      const currentWithoutTime = modifyUrl(current, (parsed) => {
        delete (parsed.query as any)._t;
        return void 0;
      });
      return currentWithoutTime;
    }

    /**
     * Gets the page/document title of the focused window/frame.
     * https://webdriver.io/docs/api/webdriver.html#gettitle
     */
    public async getTitle() {
      return await driver.getTitle();
    }

    /**
     * Navigates the focused window/frame to a new URL.
     * https://webdriver.io/docs/api/browser/url.html
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

        return await driver.url(urlWithTime);
      }
      return await driver.url(url);
    }

    /**
     * Retrieves the cookie with the given name. Returns null if there is no such cookie. The cookie will be returned as
     * a JSON object as described by the WebDriver wire protocol.
     * https://webdriver.io/docs/api/browser/getCookies.html
     *
     * @param {string} cookieName
     * @return {Promise<IWebDriverCookie>}
     */
    public async getCookie(cookieName: string) {
      return await browser.getCookies(cookieName);
    }

    /**
     * Pauses the execution in the browser, similar to setting a breakpoint for debugging.
     * @return {Promise<void>}
     */
    public async pause() {
      await driver.executeAsyncScript(
        `(async () => { debugger; return Promise.resolve(); })()`,
        []
      );
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
      await browser.executeScript('window.scrollTo(0, 0)', []);
      await browser.performActions([
        {
          type: 'pointer',
          id: 'finger1',
          parameters: {
            pointerType: 'mouse',
          },
          actions: [
            {
              type: 'pointerMove',
              duration: 0,
              x: point.x,
              y: point.y,
            },
          ],
        },
      ]);
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
      await browser.executeScript('window.scrollTo(0, 0)', []);
      // TODO: fix implementation
      const startPoint = {
        type: 'pointerMove',
        duration: 0,
        x: from?.offset?.x || 0,
        y: from?.offset?.y || 0,
      };
      const endPoint = {
        type: 'pointerMove',
        duration: 100,
        origin: 'pointer',
        x: to?.offset?.x || 0,
        y: to?.offset?.y || 0,
      };
      await browser.performActions([
        {
          type: 'pointer',
          id: 'pointer1',
          parameters: {
            pointerType: 'mouse',
          },
          actions: [
            startPoint,
            {
              type: 'pointerDown',
              button: 0,
            },
            {
              type: 'pause',
              duration: 10,
            },
            endPoint,
            {
              type: 'pointerUp',
              button: 0,
            },
          ],
        },
      ]);

      // await browser.performActions([
      //   {
      //     type: 'pointer',
      //     id: 'pointer1',
      //     parameters: { pointerType: 'mouse' },
      //     actions: [
      //       {
      //         type: 'pointerMove',
      //         origin: {
      //           ['ELEMENT_KEY']: btn2.ELEMENT_KEY,
      //         },
      //         x: -50,
      //         y: 0,
      //       },
      //       {
      //         type: 'pointerDown',
      //         button: 2,
      //       },
      //       {
      //         type: 'pointerUp',
      //         button: 2,
      //       },
      //     ],
      //   },
      // ]);
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
      await delay(150);
    }

    /**
     * Reloads the current browser window/frame.
     * https://webdriver.io/docs/api/webdriver.html#refresh
     *
     * @return {Promise<void>}
     */
    public async refresh() {
      await driver.refresh();
    }

    /**
     * Navigates the focused window/frame back one page using the browser’s navigation history.
     * https://webdriver.io/docs/api/webdriver.html#back
     *
     * @return {Promise<void>}
     */
    public async goBack() {
      await driver.back();
    }

    /**
     * Moves forwards in the browser history.
     * https://webdriver.io/docs/api/webdriver.html#forward
     *
     * @return {Promise<void>}
     */
    public async goForward() {
      await driver.forward();
    }

    /**
     * Navigates to a URL via the browser history.
     * https://webdriver.io/docs/api/webdriver.html#navigateto
     *
     * @return {Promise<void>}
     */
    public async navigateTo(url: string) {
      await driver.navigateTo(url);
    }

    /**
     * Sends a sequance of keyboard keys. For each key, this will record a pair of keyDown and keyUp actions
     * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/input_exports_Actions.html#sendKeys
     *
     * @param  {string|string[]} keys
     * @return {Promise<void>}
     */
    public async pressKeys(keys: string | string[]): Promise<void> {
      const actions = [];
      for (const key of keys) {
        actions.push({ type: 'keyDown', value: key });
      }
      for (const key of keys) {
        actions.push({ type: 'keyUp', value: key });
      }

      await browser.performActions([
        {
          type: 'key',
          id: 'keyboard',
          actions,
        },
      ]);
    }

    /**
     * Moves the remote environment’s mouse cursor to the specified point {x, y} which is
     * offset to browser page top left corner.
     * Then adds an action for left-click (down/up) with the mouse.
     * https://webdriver.io/docs/api/jsonwp.html#positionclick
     *
     * @param {x: number, y: number} point on browser page
     * @return {Promise<void>}
     */
    public async clickMouseButton(point: { x: number; y: number }) {
      const { x, y } = point;
      await browser.moveToElement(null, x, y);
      await browser.positionClick();
    }

    /**
     * Gets the HTML loaded in the focused window/frame. This markup is serialised by the remote
     * environment so may not exactly match the HTML provided by the Web server.
     * https://webdriver.io/docs/api/webdriver.html#getpagesource
     *
     * @return {Promise<string>}
     */
    public async getPageSource() {
      return await driver.getPageSource();
    }

    /**
     * Gets a screenshot of the focused window and returns it as a base-64 encoded PNG
     * https://webdriver.io/docs/api/webdriver.html#takescreenshot
     *
     * @return {Promise<Buffer>}
     */
    public async takeScreenshot() {
      return await driver.takeScreenshot();
    }

    /**
     * Inserts action for performing a double left-click with the mouse.
     * https://webdriver.io/docs/api/jsonwp.html#positiondoubleclick
     * @param {WebElementWrapper} element
     * @return {Promise<void>}
     */
    public async doubleClick() {
      await browser.positionDoubleClick();
    }

    /**
     * Changes the focus of all future commands to another window. Windows may be specified
     * by their window.name attributeor by its handle (as returned by WebDriver#getWindowHandles).
     * https://webdriver.io/docs/api/webdriver.html#switchtowindow
     *
     * @param {string} handle
     * @return {Promise<void>}
     */
    public async switchToWindow(nameOrHandle: string) {
      await driver.switchToWindow(nameOrHandle);
    }

    /**
     * Gets a list of identifiers for all currently open windows.
     * https://webdriver.io/docs/api/webdriver.html#getwindowhandles
     *
     * @return {Promise<string[]>}
     */
    public async getAllWindowHandles() {
      return await driver.getWindowHandles();
    }

    /**
     * Switches driver to specific browser tab by index
     *
     * @param {string} tabIndex
     * @return {Promise<void>}
     */
    public async switchTab(tabIndex: number) {
      const tabs = await driver.getWindowHandles();
      if (tabs.length <= tabIndex) {
        throw new Error(`Out of existing tabs bounds`);
      }
      await driver.switchToWindow(tabs[tabIndex]);
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
        [key, value]
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
     * https://webdriver.io/docs/api/webdriver.html#closewindow
     *
     * @return {Promise<void>}
     */
    public async closeCurrentWindow() {
      await driver.closeWindow();
    }

    /**
     * Executes JavaScript code within the focused window/frame. The code should return a value synchronously.
     * https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/lib/webdriver_exports_WebDriver.html#executeScript
     *
     * @param  {string|function} fn
     * @param  {...any[]} args
     */
    public async execute<A extends any[], R>(fn: string, ...args: A): Promise<R> {
      return await driver.executeScript(
        fn,
        ...cloneDeepWith<any>(args, (arg) => {
          if (arg instanceof WebElementWrapper) {
            return arg._webElement;
          }
        })
      );
    }

    // TODO: fix typings
    // public async executeAsync<T = unknown>(fn: (cb: (value?: T) => void) => void): Promise<T>;
    // public async executeAsync<T = unknown, A1 = unknown>(
    //   fn: (a1: A1, cb: (value?: T) => void) => void,
    //   a1: A1
    // ): Promise<T>;
    // public async executeAsync<T = unknown, A1 = unknown, A2 = unknown>(
    //   fn: (a1: A1, a2: A2, cb: (value?: T) => void) => void,
    //   a1: A1,
    //   a2: A2
    // ): Promise<T>;
    // public async executeAsync<T = unknown, A1 = unknown, A2 = unknown, A3 = unknown>(
    //   fn: (a1: A1, a2: A2, a3: A3, cb: (value?: T) => void) => void,
    //   a1: A1,
    //   a2: A2,
    //   a3: A3
    // ): Promise<T>;
    // public async executeAsync<T = unknown>(
    //   fn: (...args: any[]) => void,
    //   ...args: any[]
    // ): Promise<T> {
    //   return await driver.executeAsyncScript(fn, args);
    // }

    public async getScrollTop() {
      const scrollSize: string = await driver.executeScript('return document.body.scrollTop');
      return parseInt(scrollSize, 10);
    }

    public async getScrollLeft() {
      const scrollSize: string = await driver.executeScript('return document.body.scrollLeft');
      return parseInt(scrollSize, 10);
    }

    public async scrollTop() {
      await driver.executeScript('document.documentElement.scrollTop = 0');
    }

    // return promise with REAL scroll position
    public async setScrollTop(scrollSize: number | string) {
      await driver.executeScript('document.body.scrollTop = ' + scrollSize);
      return this.getScrollTop();
    }

    public async setScrollToById(elementId: string, xCoord: number, yCoord: number) {
      await driver.executeScript(
        `document.getElementById("${elementId}").scrollTo(${xCoord},${yCoord})`
      );
    }

    public async setScrollLeft(scrollSize: number | string) {
      await driver.executeScript('document.body.scrollLeft = ' + scrollSize);
      return this.getScrollLeft();
    }

    public async switchToFrame(idOrElement: number | WebElementWrapper) {
      const _id = idOrElement instanceof WebElementWrapper ? idOrElement._webElement : idOrElement;
      await driver.switchToFrame(_id);
    }

    public async checkBrowserPermission(permission: string): Promise<boolean> {
      const result: any = await driver.executeAsync(
        `navigator.permissions.query({name:'${permission}'}).then(arguments[0])`
      );

      return Boolean(result?.state === 'granted');
    }

    public getClipboardValue(): Promise<string> {
      return driver.executeAsync('navigator.clipboard.readText().then(arguments[0])');
    }
  })();
}
