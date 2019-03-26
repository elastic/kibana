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

import { WebElementWrapper } from './lib/web_element_wrapper';

export async function FindProvider({ getService }) {
  const log = getService('log');
  const config = getService('config');
  const webdriver = await getService('__webdriver__').init();
  const retry = getService('retry');

  const driver = webdriver.driver;
  const By = webdriver.By;
  const until =  webdriver.until;

  const WAIT_FOR_EXISTS_TIME = config.get('timeouts.waitForExists');
  const defaultFindTimeout = config.get('timeouts.find');
  const fixedHeaderHeight = config.get('layout.fixedHeaderHeight');

  const wrap = webElement => (
    new WebElementWrapper(webElement, webdriver, defaultFindTimeout, fixedHeaderHeight, log)
  );

  const wrapAll = webElements => (
    webElements.map(wrap)
  );

  class Find {

    currentWait = defaultFindTimeout;

    async _withTimeout(timeout) {
      if (timeout !== this.currentWait) {
        this.currentWait = timeout;
        await driver.manage().setTimeouts({ implicit: timeout });
      }
    }

    async byName(selector, timeout = defaultFindTimeout) {
      log.debug(`Find.byName('${selector}') with timeout=${timeout}`);
      return wrap(await driver.wait(until.elementLocated(By.name(selector)), timeout));
    }

    async byCssSelector(selector, timeout = defaultFindTimeout) {
      log.debug(`Find.findByCssSelector('${selector}') with timeout=${timeout}`);
      return wrap(await driver.wait(until.elementLocated(By.css(selector)), timeout));
    }

    async byClassName(selector, timeout = defaultFindTimeout) {
      log.debug(`Find.findByClassName('${selector}') with timeout=${timeout}`);
      return wrap(await driver.wait(until.elementLocated(By.className(selector)), timeout));
    }

    async activeElement() {
      return wrap(await driver.switchTo().activeElement());
    }

    async setValue(selector, text) {
      log.debug(`Find.setValue('${selector}', '${text}')`);
      return await retry.try(async () => {
        const element = await this.byCssSelector(selector);
        await element.click();

        // in case the input element is actually a child of the testSubject, we
        // call clearValue() and type() on the element that is focused after
        // clicking on the testSubject
        const input = await this.activeElement();
        if (input) {
          await input.clearValue();
          await input.type(text);
        } else {
          await element.clearValue();
          await element.type(text);
        }
      });
    }

    async filterElementIsDisplayed(elements) {
      if (elements.length === 0) {
        return [];
      } else {
        const displayed = [];
        for (let i = 0; i < elements.length; i++) {
          const isDisplayed = await elements[i].isDisplayed();
          if (isDisplayed) {
            displayed.push(elements[i]);
          }
        }
        return displayed;
      }
    }

    async allByCustom(findAllFunction, timeout = defaultFindTimeout) {
      await this._withTimeout(timeout);
      return await retry.try(async () => {
        let elements = await findAllFunction(driver);
        if (!elements) elements = [];
        // Force isStale checks for all the retrieved elements.
        await Promise.all(elements.map(async element => await element.isEnabled()));
        await this._withTimeout(defaultFindTimeout);
        return elements;
      });
    }

    async allByLinkText(selector, timeout = defaultFindTimeout) {
      log.debug(`Find.allByLinkText('${selector}') with timeout=${timeout}`);
      await this._withTimeout(timeout);
      const elements = await driver.findElements(By.linkText(selector));
      await this._withTimeout(defaultFindTimeout);
      return wrapAll(elements);
    }

    async allByCssSelector(selector, timeout = defaultFindTimeout) {
      log.debug(`Find.allByCssSelector('${selector}') with timeout=${timeout}`);
      await this._withTimeout(timeout);
      const elements = await driver.findElements(By.css(selector));
      await this._withTimeout(defaultFindTimeout);
      return wrapAll(elements);
    }

    async descendantExistsByCssSelector(selector, parentElement, timeout = WAIT_FOR_EXISTS_TIME) {
      log.debug(`Find.descendantExistsByCssSelector('${selector}') with timeout=${timeout}`);
      return await this.exists(async () => wrapAll(await parentElement._webElement.findElements(By.css(selector)), timeout));
    }

    async descendantDisplayedByCssSelector(selector, parentElement) {
      log.debug(`Find.descendantDisplayedByCssSelector('${selector}')`);
      const element = await parentElement._webElement.findElement(By.css(selector));
      const descendant = wrap(element);
      const isDisplayed = await descendant.isDisplayed();
      if (isDisplayed) {
        return descendant;
      } else {
        throw new Error('Element is not displayed');
      }
    }

    async allDescendantDisplayedByCssSelector(selector, parentElement) {
      log.debug(`Find.allDescendantDisplayedByCssSelector('${selector}')`);
      const allElements = await wrapAll(await parentElement._webElement.findElements(By.css(selector)));
      return await this.filterElementIsDisplayed(allElements);
    }

    async displayedByLinkText(linkText, timeout = defaultFindTimeout) {
      log.debug(`Find.displayedByLinkText('${linkText}') with timeout=${timeout}`);
      const element = await this.byLinkText(linkText, timeout);
      log.debug(`Wait for element become visible: ${linkText} with timeout=${timeout}`);
      await driver.wait(until.elementIsVisible(element._webElement), timeout);
      return wrap(element);
    }

    async displayedByCssSelector(selector, timeout = defaultFindTimeout) {
      log.debug(`Find.displayedByCssSelector(${selector})`);
      const element = await this.byCssSelector(selector, timeout);
      log.debug(`Wait for element become visible: ${selector} with timeout=${timeout}`);
      await driver.wait(until.elementIsVisible(element._webElement), timeout);
      return wrap(element);
    }

    async byLinkText(selector, timeout = defaultFindTimeout) {
      log.debug(`Find.byLinkText('${selector}') with timeout=${timeout}`);
      return wrap(await driver.wait(until.elementLocated(By.linkText(selector)), timeout));
    }

    async byPartialLinkText(partialLinkText, timeout = defaultFindTimeout) {
      log.debug(`Find.byPartialLinkText('${partialLinkText}')  with timeout=${timeout}`);
      return wrap(await driver.wait(until.elementLocated(By.partialLinkText(partialLinkText)), timeout));
    }

    async exists(findFunction, timeout = WAIT_FOR_EXISTS_TIME) {
      await this._withTimeout(timeout);
      try {
        const found = await findFunction(driver);
        await this._withTimeout(defaultFindTimeout);
        if (Array.isArray(found)) {
          return found.length > 0;
        } else {
          return found instanceof WebElementWrapper;
        }
      } catch (err) {
        await this._withTimeout(defaultFindTimeout);
        return false;
      }
    }

    async existsByLinkText(linkText, timeout = WAIT_FOR_EXISTS_TIME) {
      log.debug(`Find.existsByLinkText('${linkText}')  with timeout=${timeout}`);
      return await this.exists(async driver => wrapAll(await driver.findElements(By.linkText(linkText))), timeout);
    }

    async existsByDisplayedByCssSelector(selector, timeout = WAIT_FOR_EXISTS_TIME) {
      log.debug(`Find.existsByDisplayedByCssSelector('${selector}') with timeout=${timeout}`);
      return await this.exists(async (driver) => {
        const elements = wrapAll(await driver.findElements(By.css(selector)));
        return await this.filterElementIsDisplayed(elements);
      }, timeout);
    }

    async existsByCssSelector(selector, timeout = WAIT_FOR_EXISTS_TIME) {
      log.debug(`Find.existsByCssSelector('${selector}') with timeout=${timeout}`);
      return await this.exists(async driver => wrapAll(await driver.findElements(By.css(selector))), timeout);
    }

    async clickByCssSelectorWhenNotDisabled(selector, { timeout } = { timeout: defaultFindTimeout }) {
      log.debug(`Find.clickByCssSelectorWhenNotDisabled('${selector}') with timeout=${timeout}`);

      // Don't wrap this code in a retry, or stale element checks may get caught here and the element
      // will never be re-grabbed.  Let errors bubble, but continue checking for disabled property until
      // it's gone.
      const element = await this.byCssSelector(selector, timeout);
      await element.moveMouseTo();
      await driver.wait(until.elementIsEnabled(element._webElement), timeout);
      await element.click();
    }

    async clickByPartialLinkText(linkText, timeout = defaultFindTimeout) {
      log.debug(`Find.clickByPartialLinkText('${linkText}') with timeout=${timeout}`);
      await retry.try(async () => {
        const element = await this.byPartialLinkText(linkText, timeout);
        await element.moveMouseTo();
        await element.click();
      });
    }

    async clickByLinkText(linkText, timeout = defaultFindTimeout) {
      log.debug(`Find.clickByLinkText('${linkText}') with timeout=${timeout}`);
      await retry.try(async () => {
        const element = await this.byLinkText(linkText, timeout);
        await element.moveMouseTo();
        await element.click();
      });
    }

    async byButtonText(buttonText, element = driver, timeout = defaultFindTimeout) {
      log.debug(`Find.byButtonText('${buttonText}') with timeout=${timeout}`);
      return await retry.tryForTime(timeout, async () => {
        const _element = (element instanceof WebElementWrapper) ? element._webElement : element;
        const allButtons = wrapAll(await _element.findElements(By.tagName('button')));
        const buttonTexts = await Promise.all(allButtons.map(async (el) => {
          return el.getVisibleText();
        }));
        const index = buttonTexts.findIndex(text => text.trim() === buttonText.trim());
        if (index === -1) {
          throw new Error('Button not found');
        }
        return allButtons[index];
      });
    }

    async clickByButtonText(buttonText, element = driver, timeout = defaultFindTimeout) {
      log.debug(`Find.clickByButtonText('${buttonText}') with timeout=${timeout}`);
      await retry.try(async () => {
        const button = await this.byButtonText(buttonText, element, timeout);
        await button.click();
      });
    }

    async clickByCssSelector(selector, timeout = defaultFindTimeout) {
      log.debug(`Find.clickByCssSelector('${selector}') with timeout=${timeout}`);
      await retry.try(async () => {
        const element = await this.byCssSelector(selector, timeout);
        if (element) {
          //await element.moveMouseTo();
          await element.click();
        } else {
          throw new Error(`Element with css='${selector}' is not found`);
        }
      });
    }
    async clickByDisplayedLinkText(linkText, timeout = defaultFindTimeout) {
      log.debug(`Find.clickByDisplayedLinkText('${linkText}') with timeout=${timeout}`);
      await retry.try(async () => {
        const element = await this.displayedByLinkText(linkText, timeout);
        if (element) {
          await element.moveMouseTo();
          await element.click();
        } else {
          throw new Error(`Element with linkText='${linkText}' is not found`);
        }
      });
    }
    async clickDisplayedByCssSelector(selector, timeout = defaultFindTimeout) {
      log.debug(`Find.clickDisplayedByCssSelector('${selector}') with timeout=${timeout}`);
      await retry.try(async () => {
        const element = await this.displayedByCssSelector(selector, timeout);
        if (element) {
          await element.moveMouseTo();
          await element.click();
        } else {
          throw new Error(`Element with css='${selector}' is not found`);
        }
      });
    }
    async waitForDeletedByCssSelector(selector, timeout = defaultFindTimeout) {
      log.debug(`Find.waitForDeletedByCssSelector('${selector}') with timeout=${timeout}`);
      await this._withTimeout(1000);
      await driver.wait(async () => {
        const found  =  await driver.findElements(By.css(selector));
        return found.length === 0;
      },
      timeout,
      `The element ${selector} was still present when it should have disappeared.`);
      await this._withTimeout(defaultFindTimeout);
    }

    async waitForAttributeToChange(selector, attribute, value) {
      log.debug(`Find.waitForAttributeToChange('${selector}', '${attribute}', '${value}')`);
      retry.waitFor(`${attribute} to equal "${value}"`, async () => {
        const el = await this.byCssSelector(selector);
        return value === await el.getAttribute(attribute);
      });
    }

    async waitForElementStale(element, timeout = defaultFindTimeout) {
      log.debug(`Find.waitForElementStale with timeout=${timeout}`);
      await driver.wait(until.stalenessOf(element._webElement), timeout);
    }
  }

  return new Find();
}
