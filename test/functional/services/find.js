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

// Many of our tests use the `exists` functions to determine where the user is. For
// example, you'll see a lot of code like:
// if (!testSubjects.exists('someElementOnPageA')) {
//   navigateToPageA();
// }
// If the element doesn't exist, selenium would wait up to defaultFindTimeout for it to
// appear. Because there are many times when we expect it to not be there, we don't want
// to wait the full amount of time, or it would greatly slow our tests down. We used to have
// this value at 1 second, but this caused flakiness because sometimes the element was deemed missing
// only because the page hadn't finished loading.
// The best path forward it to prefer functions like `testSubjects.existOrFail` or
// `testSubjects.missingOrFail` instead of just the `exists` checks, and be deterministic about
// where your user is and what they should click next.
export const WAIT_FOR_EXISTS_TIME = 2500;

export async function FindProvider({ getService }) {
  const log = getService('log');
  const config = getService('config');
  const { driver, until, By } = await getService('__webdriver__').init();
  const retry = getService('retry');

  const defaultFindTimeout = config.get('timeouts.find');

  const wrap = webElement => (
    new WebElementWrapper(webElement, driver, defaultFindTimeout)
  );

  const wrapAll = webElements => (
    webElements.map(wrap)
  );

  class Find {
    async _withTimeout(timeout) {
      await driver.manage().setTimeouts({ implicit: timeout });
    }

    async byName(selector, timeout = defaultFindTimeout) {
      log.debug(`find.byName(${selector})`);
      return wrap(await driver.wait(until.elementLocated(By.name(selector)), timeout));
    }

    async byCssSelector(selector, timeout = defaultFindTimeout) {
      log.debug(`findByCssSelector ${selector}`);
      return wrap(await driver.wait(until.elementLocated(By.css(selector)), timeout));
    }

    async byClassName(selector, timeout = defaultFindTimeout) {
      log.debug(`findByClassName ${selector}`);
      return wrap(await driver.wait(until.elementLocated(By.className(selector)), timeout));
    }

    async activeElement() {
      return wrap(await driver.switchTo().activeElement());
    }

    async setValue(selector, text) {
      return await retry.try(async () => {
        const element = await this.byCssSelector(selector);
        await element.click();

        // in case the input element is actually a child of the testSubject, we
        // call clearValue() and type() on the element that is focused after
        // clicking on the testSubject
        const input = await this.activeElement();
        await input.clear();
        await input.sendKeys(text);
      });
    }

    async allByCustom(findAllFunction, timeout = defaultFindTimeout) {
      await this._withTimeout(timeout);
      return await retry.try(async () => {
        let elements = await findAllFunction(driver);
        if (!elements) elements = [];
        // Force isStale checks for all the retrieved elements.
        await Promise.all(elements.map(async element => await element.isEnabled()));
        return elements;
      });
    }

    async allByLinkText(selector, timeout = defaultFindTimeout) {
      log.debug('find.allByLinkText: ' + selector);
      return await this.allByCustom(async driver => wrapAll(await driver.findElements(By.linkText(selector)), timeout));
    }

    async allByCssSelector(selector, timeout = defaultFindTimeout) {
      log.debug('in findAllByCssSelector: ' + selector);
      return await this.allByCustom(async driver => wrapAll(await driver.findElements(By.css(selector)), timeout));
    }

    async descendantExistsByCssSelector(selector, parentElement, timeout = WAIT_FOR_EXISTS_TIME) {
      log.debug('Find.descendantExistsByCssSelector: ' + selector);
      return await this.exists(async () => wrapAll(await parentElement.findElements(By.css(selector)), timeout));
    }

    async descendantDisplayedByCssSelector(selector, parentElement) {
      log.debug('Find.descendantDisplayedByCssSelector: ' + selector);
      const descendant = wrap(await parentElement.findElement(By.css(selector)));
      const isDisplayed = await descendant.isDisplayed();
      if (isDisplayed) {
        return descendant;
      } else {
        throw new Error('Element is not displayed');
      }
    }

    async allDescendantDisplayedByCssSelector(selector, parentElement) {
      log.debug(`Find.allDescendantDisplayedByCssSelector(${selector})`);
      const allElements = await wrapAll(parentElement.findElements(By.css(selector)));
      return await Promise.all(
        allElements.map(async (element) => {return await element.isDisplayed(); })
      );
    }

    async displayedByCssSelector(selector, timeout = defaultFindTimeout) {
      log.debug('in displayedByCssSelector: ' + selector);
      await this._withTimeout(timeout);
      const child = await driver.findElement(By.css(selector));
      await driver.wait(until.elementIsVisible(child), timeout);
      return wrap(child);
    }

    async byLinkText(selector, timeout = defaultFindTimeout) {
      log.debug('Find.byLinkText: ' + selector);
      return wrap(await driver.wait(until.elementLocated(By.linkText(selector)), timeout));
    }

    async byPartialLinkText(partialLinkText, timeout = defaultFindTimeout) {
      log.debug(`find.byPartialLinkText(${partialLinkText})`);
      return wrap(await driver.wait(until.elementLocated(By.partialLinkText(partialLinkText)), timeout));
    }

    async exists(findFunction, timeout = WAIT_FOR_EXISTS_TIME) {
      await this._withTimeout(timeout);
      const found = await findFunction(driver);
      return found.length > 0;
    }

    async existsByLinkText(linkText, timeout = WAIT_FOR_EXISTS_TIME) {
      log.debug(`existsByLinkText ${linkText}`);
      return await this.exists(async driver => wrapAll(await driver.findElements(By.linkText(linkText))), timeout);
    }

    async existsByDisplayedByCssSelector(selector, timeout = WAIT_FOR_EXISTS_TIME) {
      log.debug(`existsByDisplayedByCssSelector ${selector}`);
      return await this.exists(async driver => {
        const elements = wrapAll(await driver.findElements(By.css(selector)));
        return await Promise.all(
          elements.map(async (element) => {return await element.isDisplayed(); })
        );
      }, timeout);
    }

    async existsByCssSelector(selector, timeout = WAIT_FOR_EXISTS_TIME) {
      log.debug(`existsByCssSelector ${selector}`);
      return await this.exists(async driver => wrapAll(await driver.findElements(By.css(selector))), timeout);
    }

    async moveMouseTo(element) {
      const mouse = driver.actions().mouse();
      const actions = driver.actions({ bridge: true });
      await actions.pause(mouse).move({ origin: element._webElement }).perform();
    }

    async clickByCssSelectorWhenNotDisabled(selector, { timeout } = { timeout: defaultFindTimeout }) {
      log.debug(`Find.clickByCssSelectorWhenNotDisabled`);

      // Don't wrap this code in a retry, or stale element checks may get caught here and the element
      // will never be re-grabbed.  Let errors bubble, but continue checking for disabled property until
      // it's gone.
      const element = await this.byCssSelector(selector, timeout);
      await this.moveMouseTo(element);
      await driver.wait(until.elementIsEnabled(element._webElement), timeout);
      await element.click();
    }

    async clickByPartialLinkText(linkText, timeout = defaultFindTimeout) {
      log.debug(`clickByPartialLinkText(${linkText})`);
      await retry.try(async () => {
        const element = await this.byPartialLinkText(linkText, timeout);
        await this.moveMouseTo(element);
        await element.click();
      });
    }

    async clickByLinkText(linkText, timeout = defaultFindTimeout) {
      log.debug(`clickByLinkText(${linkText})`);
      await retry.try(async () => {
        const element = await this.byLinkText(linkText, timeout);
        await this.moveMouseTo(element);
        await element.click();
      });
    }

    async byButtonText(buttonText, element = driver, timeout = defaultFindTimeout) {
      log.debug(`byButtonText(${buttonText})`);
      return await retry.tryForTime(timeout, async () => {
        const allButtons = wrapAll(await element.findElements(By.tagName('button')));
        const buttonTexts = await Promise.all(allButtons.map(async (el) => {
          return el.getText();
        }));
        const index = buttonTexts.findIndex(text => text.trim() === buttonText.trim());
        if (index === -1) {
          throw new Error('Button not found');
        }
        return allButtons[index];
      });
    }

    async clickByButtonText(buttonText, element = driver, timeout = defaultFindTimeout) {
      log.debug(`clickByButtonText(${buttonText})`);
      await retry.try(async () => {
        const button = await this.byButtonText(buttonText, element, timeout);
        await button.click();
      });
    }

    async clickByCssSelector(selector, timeout = defaultFindTimeout) {
      log.debug(`clickByCssSelector(${selector})`);
      await retry.try(async () => {
        const element = await this.byCssSelector(selector, timeout);
        await this.moveMouseTo(element);
        await element.click();
      });
    }
    async clickByDisplayedLinkText(linkText, timeout = defaultFindTimeout) {
      log.debug(`clickByDisplayedLinkText(${linkText})`);
      await retry.try(async () => {
        const element = await this.findDisplayedByLinkText(linkText, timeout);
        await this.moveMouseTo(element);
        await element.click();
      });
    }
    async clickDisplayedByCssSelector(selector, timeout = defaultFindTimeout) {
      await retry.try(async () => {
        const element = await this.findDisplayedByCssSelector(selector, timeout);
        await this.moveMouseTo(element);
        await element.click();
      });
    }
    async waitForDeletedByCssSelector(selector) {
      await driver.wait(() => {
        return driver.findElements(selector).then((elements) => {
          if (elements.length <= 0) {
            return true;
          }
          return false;
        });
      },
      defaultFindTimeout,
      `The element ${selector} was still present when it should have disappeared.`);
    }
  }

  return new Find();
}
