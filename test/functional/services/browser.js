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

import { modifyUrl } from '../../../src/core/utils';
import Keys from 'leadfoot/keys';

export function BrowserProvider({ getService }) {
  const leadfoot = getService('__leadfoot__');

  class BrowserService {

    /**
     * Keyboard events
     */
    keys = Keys;

    /**
     * Gets the dimensions of a window.
     * https://theintern.io/leadfoot/module-leadfoot_Session.html#getWindowSize
     *
     * @param  {string} windowHandle Optional - Omit this argument to query the currently focused window.
     * @return {Promise<{width: number, height: number}>}
     */
    async getWindowSize(...args) {
      return await leadfoot.getWindowSize(...args);
    }

    /**
     * Sets the dimensions of a window.
     * https://theintern.io/leadfoot/module-leadfoot_Session.html#setWindowSize
     *
     * @param {string} windowHandle Optional
     * @param {number} width
     * @param {number} height
     * @return {Promise<void>}
     */
    async setWindowSize(...args) {
      await leadfoot.setWindowSize(...args);
    }

    /**
     * Gets the URL that is loaded in the focused window/frame.
     * https://theintern.io/leadfoot/module-leadfoot_Session.html#getCurrentUrl
     *
     * @return {Promise<string>}
     */
    async getCurrentUrl() {
      // strip _t=Date query param when url is read
      const current = await leadfoot.getCurrentUrl();
      const currentWithoutTime = modifyUrl(current, parsed => {
        delete parsed.query._t;
      });
      return currentWithoutTime;
    }

    /**
     * Navigates the focused window/frame to a new URL.
     * https://theintern.io/leadfoot/module-leadfoot_Session.html#get
     *
     * @param {string} url
     * @param {boolean} insertTimestamp Optional
     * @return {Promise<void>}
     */
    async get(url, insertTimestamp = true) {
      if (insertTimestamp) {
        const urlWithTime = modifyUrl(url, parsed => {
          parsed.query._t = Date.now();
        });

        return await leadfoot.get(urlWithTime);
      }
      return await leadfoot.get(url);
    }

    /**
     * Moves the remote environment’s mouse cursor to the specified element or relative
     * position. If the element is outside of the viewport, the remote driver will attempt
     * to scroll it into view automatically.
     * https://theintern.io/leadfoot/module-leadfoot_Session.html#moveMouseTo
     *
     * @param {Element} element Optional
     * @param {number} xOffset Optional
     * @param {number} yOffset Optional
     * @return {Promise<void>}
     */
    async moveMouseTo(element, xOffset, yOffset) {
      if (element) {
        await element.moveMouseTo(xOffset, yOffset);
      } else {
        await leadfoot.moveMouseTo(null, xOffset, yOffset);
      }
    }

    /**
     * Does a drag-and-drop action from one point to another
     *
     * @param {{element: LeadfootElementWrapper, xOffset: number, yOffset: number}} from
     * @param {{element: LeadfootElementWrapper, xOffset: number, yOffset: number}} to
     * @return {Promise<void>}
     */
    async dragAndDrop(from, to) {
      await this.moveMouseTo(from.element, from.xOffset, from.yOffset);
      await leadfoot.pressMouseButton();
      await this.moveMouseTo(to.element, to.xOffset, to.yOffset);
      await leadfoot.releaseMouseButton();

    }

    /**
     * Reloads the current browser window/frame.
     * https://theintern.io/leadfoot/module-leadfoot_Session.html#refresh
     *
     * @return {Promise<void>}
     */
    async refresh() {
      await leadfoot.refresh();
    }

    /**
     * Navigates the focused window/frame back one page using the browser’s navigation history.
     * https://theintern.io/leadfoot/module-leadfoot_Session.html#goBack
     *
     * @return {Promise<void>}
     */
    async goBack() {
      await leadfoot.goBack();
    }

    /**
     * Types into the focused window/frame/element.
     * https://theintern.io/leadfoot/module-leadfoot_Session.html#pressKeys
     *
     * @param  {string|string[]} keys
     * @return {Promise<void>}
     */
    async pressKeys(...args) {
      await leadfoot.pressKeys(...args);
    }

    /**
     * Clicks a mouse button at the point where the mouse cursor is currently positioned. This
     * method may fail to execute with an error if the mouse has not been moved anywhere since
     * the page was loaded.
     * https://theintern.io/leadfoot/module-leadfoot_Session.html#clickMouseButton
     *
     * @param {number} button Optional
     * @return {Promise<void>}
     */
    async clickMouseButton(...args) {
      await leadfoot.clickMouseButton(...args);
    }

    /**
     * Gets the HTML loaded in the focused window/frame. This markup is serialised by the remote
     * environment so may not exactly match the HTML provided by the Web server.
     * https://theintern.io/leadfoot/module-leadfoot_Session.html#getPageSource
     *
     * @return {Promise<string>}
     */
    async getPageSource(...args) {
      return await leadfoot.getPageSource(...args);
    }

    /**
     * Gets all logs from the remote environment of the given type. The logs in the remote
     * environment are cleared once they have been retrieved.
     * https://theintern.io/leadfoot/module-leadfoot_Session.html#getLogsFor
     *
     * @param {string} type
     * @return {Promise<LogEntry[]>}
     */
    async getLogsFor(...args) {
      return await leadfoot.getLogsFor(...args);
    }

    /**
     * Gets a screenshot of the focused window and returns it in PNG format.
     * https://theintern.io/leadfoot/module-leadfoot_Session.html#takeScreenshot
     *
     * @return {Promise<Buffer>}
     */
    async takeScreenshot(...args) {
      return await leadfoot.takeScreenshot(...args);
    }

    /**
     * Double-clicks the primary mouse button.
     * https://theintern.io/leadfoot/module-leadfoot_Session.html#doubleClick
     *
     * @return {Promise<void>}
     */
    async doubleClick(...args) {
      await leadfoot.doubleClick(...args);
    }

    /**
     * Switches the currently focused window to a new window.
     * https://theintern.io/leadfoot/module-leadfoot_Session.html#switchToWindow
     *
     * @param {string} handle
     * @return {Promise<void>}
     */
    async switchToWindow(...args) {
      await leadfoot.switchToWindow(...args);
    }

    /**
     * Gets a list of identifiers for all currently open windows.
     * https://theintern.io/leadfoot/module-leadfoot_Session.html#getAllWindowHandles
     *
     * @return {Promise<string[]>}
     */
    async getAllWindowHandles(...args) {
      return await leadfoot.getAllWindowHandles(...args);
    }

    /**
     * Sets a value in local storage for the focused window/frame.
     * https://theintern.io/leadfoot/module-leadfoot_Session.html#setLocalStorageItem
     *
     * @param {string} key
     * @param {string} value
     * @return {Promise<void>}
     */
    async setLocalStorageItem(key, value) {
      await leadfoot.setLocalStorageItem(key, value);
    }

    /**
     * Closes the currently focused window. In most environments, after the window has been
     * closed, it is necessary to explicitly switch to whatever window is now focused.
     * https://theintern.io/leadfoot/module-leadfoot_Session.html#closeCurrentWindow
     *
     * @return {Promise<void>}
     */
    async closeCurrentWindow(...args) {
      await leadfoot.closeCurrentWindow(...args);
    }

    /**
     * Executes JavaScript code within the focused window/frame. The code should return a value synchronously.
     * https://theintern.io/leadfoot/module-leadfoot_Session.html#execute
     *
     * @param  {string|function} function
     * @param  {...any[]} args
     */
    async execute(...args) {
      return await leadfoot.execute(...args);
    }
  }

  return  new BrowserService();
}
