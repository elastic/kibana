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

import { By, Key } from 'selenium-webdriver';

const webdriver = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const firefox = require('selenium-webdriver/firefox');
const until = require('selenium-webdriver/lib/until');
import { modifyUrl } from '../../../../src/core/utils';

export async function RemoteProvider({ getService }) {
  const lifecycle = getService('lifecycle');
  const config = getService('config');
  const defaultFindTimeout = config.get('timeouts.find');
  const log = getService('log');
  const possibleBrowsers = ['chrome', 'firefox', 'ie'];
  const browserType = process.env.TEST_BROWSER_TYPE || 'chrome';

  if (!possibleBrowsers.includes(browserType)) {
    throw new Error(`Unexpected TEST_BROWSER_TYPE "${browserType}". Valid options are ` + possibleBrowsers.join(','));
  }

  const chromeOptions = new chrome.Options();
  const prefs = new webdriver.logging.Preferences();
  const loggingPref = prefs.setLevel(webdriver.logging.Type.BROWSER, webdriver.logging.Level.ALL);
  chromeOptions.addArguments('verbose');
  chromeOptions.setLoggingPrefs(loggingPref);
  // chromeOptions.headless();
  // chromeOptions.windowSize({ width: 1200, height: 1100 });

  const chromeService = new chrome.ServiceBuilder()
    // .loggingTo(process.stdout)
    .enableVerboseLogging();

  const firefoxOptions = new firefox.Options();
  // firefoxOptions.headless();
  // chromeOptions.windowSize({ width: 1200, height: 1100 });

  const firefoxService = new firefox.ServiceBuilder()
    // .loggingTo(process.stdout)
    .enableVerboseLogging();

  const driver = new webdriver.Builder()
    .forBrowser(browserType)
    .setChromeOptions(chromeOptions)
    .setChromeService(chromeService)
    .setFirefoxOptions(firefoxOptions)
    .setFirefoxService(firefoxService)
    .build();



  const actions = driver.actions();
  const mouse = actions.mouse();
  lifecycle.on('cleanup', async () => await driver.quit());

  log.info('Remote initialized');



  lifecycle.on('beforeTests', async () => {
    // hard coded default, can be overridden per suite using `remote.setWindowSize()`
    // and will be automatically reverted after each suite
    await driver.manage().window().setRect({ width: 1600, height: 1000 });
  });

  const windowSizeStack = [];
  lifecycle.on('beforeTestSuite', async () => {
    windowSizeStack.unshift(await driver.manage().window().getRect());
  });

  lifecycle.on('afterTestSuite', async () => {
    const { width, height } = windowSizeStack.shift();
    await driver.manage().window().setRect({ width: width, height: height });
  });
  function createRemoteApi(findTimeout = defaultFindTimeout) {

    async function updateFindTimeout() {
      await driver.manage().setTimeouts({ implicit: findTimeout });
    }

    return {
      async findByCssSelector(selector) {
        await updateFindTimeout();
        return await driver.findElement(By.css(selector));
      },

      async findAllByCssSelector(selector) {
        await updateFindTimeout();
        return await driver.findElements(By.css(selector));
      },

      async findByName(name) {
        await updateFindTimeout();
        return await driver.findElement(By.name(name));
      },

      async findByLinkText(text) {
        await updateFindTimeout();
        return await driver.findElement(By.linkText(text));
      },

      async findByPartialLinkText(text) {
        await updateFindTimeout();
        return await driver.findElement(By.partialLinkText(text));
      },

      async findByClassName(className) {
        await updateFindTimeout();
        return await driver.findElement(By.className(className));
      },

      async setWindowSize(x, y) {
        await driver.manage().window().setRect({ width: x, height: y });
      },

      async exists(selector) {
        return await this.findByCssSelector(selector).isDisplayed();
      },

      async click(selector) {
        await this.findByCssSelector(selector).click();
      },

      // async append(selector, text) {

      // },

      async get(url, insertTimestamp = true) {
        if (insertTimestamp) {
          const urlWithTime = modifyUrl(url, parsed => {
            parsed.query._t = Date.now();
          });

          return await driver.get(urlWithTime);
        }
        return await driver.get(url);
      },

      async getCurrentUrl() {
        const current = await driver.getCurrentUrl();
        const currentWithoutTime = modifyUrl(current, parsed => {
          delete parsed.query._t;
        });
        return currentWithoutTime;
      },

      async pressKeys(keys) {
        switch (keys) {
          case '\ue006':
            await actions.keyDown(Key.ENTER).pause().pause().keyUp(Key.ENTER);
            break;
        }
      },

      //TODO: Implement Slow Type For Firefox to use (50ms)
      async type(element, text) {
        const textArray = text.split('');
        for (let i = 0; i < textArray.length; i++) {
          await driver.sleep(50);
          await element.sendKeys(textArray[i]);
        }
      },

      async slowType(element, text, interval) {
        const textArray = text.split('');
        for (let i = 0; i < textArray.length; i++) {
          await this.sleep(interval);
          await element.sendKeys(textArray[i]);
        }
      },

      async moveMouseTo(element) {
        // const element = await this.findByCssSelector(selector);
        await actions.pause(mouse).move({ origin: element });
      },

      async getActiveElement() {
        return await driver.switchTo().activeElement();
      },

      async sleep(milliseconds) {
        await driver.sleep(milliseconds);
      },

      async descendantExistsByCssSelector(selector, parentElement) {
        return await parentElement.findElement(selector).isDisplayed();
      },

      async getPageSource() {
        return await driver.getPageSource();
      },

      async refresh() {
        await driver.navigate().refresh();
      },

      setFindTimeout(milliseconds) {
        return createRemoteApi(milliseconds);
      },

      async takeScreenshot(scroll = false) {
        return await driver.takeScreenshot(scroll);
      },

      async waitForCondition(conditionFunc) {
        await driver.wait(conditionFunc);
      },

      async waitForElementPresent(selector) {
        await driver.wait(until.elementLocated(By.css(selector)));
      },

      async waitForElementEnabled(selector) {
        await driver.wait(until.elementIsEnabled(By.css(selector)));
      },

      async waitForElementToContainText(selector, substring) {
        await driver.wait(until.elementTextContains(By.css(selector), substring));
      },

      async waitForElementTextEquals(selector, text) {
        await driver.wait(until.elementTextIs(By.css(selector), text));
      },

      async waitForElementVisible(selector) {
        await driver.wait(until.elementIsVisible(By.css(selector)));
      }
    };
  }
  return createRemoteApi();
}
