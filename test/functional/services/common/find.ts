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

import { WebDriver, WebElement, By, until } from 'selenium-webdriver';
import { FtrProviderContext } from '../../ftr_provider_context';
import { WebElementWrapper } from '../lib/web_element_wrapper';

export async function FindProvider({ getService }: FtrProviderContext) {
  const log = getService('log');
  const config = getService('config');
  const { driver, browserType } = await getService('__webdriver__').init();
  const retry = getService('retry');

  const WAIT_FOR_EXISTS_TIME = config.get('timeouts.waitForExists');
  const POLLING_TIME = 500;
  const defaultFindTimeout = config.get('timeouts.find');
  const fixedHeaderHeight = config.get('layout.fixedHeaderHeight');

  const wrap = (webElement: WebElement | WebElementWrapper, locator: By | null = null) =>
    WebElementWrapper.create(
      webElement,
      locator,
      driver,
      defaultFindTimeout,
      fixedHeaderHeight,
      log,
      browserType
    );

  const wrapAll = (webElements: Array<WebElement | WebElementWrapper>) =>
    webElements.map((e) => wrap(e));

  const findAndWrap = async (locator: By, timeout: number): Promise<WebElementWrapper> => {
    const webElement = await driver.wait(until.elementLocated(locator), timeout);
    return wrap(webElement, locator);
  };

  class Find {
    public currentWait = defaultFindTimeout;

    public async byName(
      selector: string,
      timeout: number = defaultFindTimeout
    ): Promise<WebElementWrapper> {
      log.debug(`Find.byName('${selector}') with timeout=${timeout}`);
      return await findAndWrap(By.name(selector), timeout);
    }

    public async byCssSelector(
      selector: string,
      timeout: number = defaultFindTimeout
    ): Promise<WebElementWrapper> {
      log.debug(`Find.findByCssSelector('${selector}') with timeout=${timeout}`);
      return findAndWrap(By.css(selector), timeout);
    }

    public async byXPath(
      selector: string,
      timeout: number = defaultFindTimeout
    ): Promise<WebElementWrapper> {
      log.debug(`Find.byXPath('${selector}') with timeout=${timeout}`);
      return findAndWrap(By.xpath(selector), timeout);
    }

    public async byClassName(
      selector: string,
      timeout: number = defaultFindTimeout
    ): Promise<WebElementWrapper> {
      log.debug(`Find.findByClassName('${selector}') with timeout=${timeout}`);
      return findAndWrap(By.className(selector), timeout);
    }

    public async activeElement(): Promise<WebElementWrapper> {
      return wrap(await driver.switchTo().activeElement());
    }

    public async setValue(selector: string, text: string): Promise<void> {
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

    public async selectValue(selector: string, value: string): Promise<void> {
      log.debug(`Find.selectValue('${selector}', option[value="${value}"]')`);
      const combobox = await this.byCssSelector(selector);
      const $ = await combobox.parseDomContent();
      const text = $(`option[value="${value}"]`).text();
      await combobox.type(text);
    }

    public async filterElementIsDisplayed(elements: WebElementWrapper[]) {
      if (elements.length === 0) {
        return [];
      } else {
        const displayed = [];
        // tslint:disable-next-line:prefer-for-of
        for (let i = 0; i < elements.length; i++) {
          const isDisplayed = await elements[i].isDisplayed();
          if (isDisplayed) {
            displayed.push(elements[i]);
          }
        }
        return displayed;
      }
    }

    public async allByCustom(
      findAllFunction: (drive: WebDriver) => WebElementWrapper[],
      timeout = defaultFindTimeout
    ): Promise<WebElementWrapper[]> {
      await this._withTimeout(timeout);
      return await retry.try(async () => {
        let elements = await findAllFunction(driver);
        if (!elements) {
          elements = [];
        }
        // Force isStale checks for all the retrieved elements.
        await Promise.all(elements.map(async (element) => await element.isEnabled()));
        await this._withTimeout(defaultFindTimeout);
        return elements;
      });
    }

    public async allByLinkText(
      selector: string,
      timeout: number = defaultFindTimeout
    ): Promise<WebElementWrapper[]> {
      log.debug(`Find.allByLinkText('${selector}') with timeout=${timeout}`);
      await this._withTimeout(timeout);
      const elements = await driver.findElements(By.linkText(selector));
      await this._withTimeout(defaultFindTimeout);
      return wrapAll(elements);
    }

    public async allByButtonText(
      buttonText: string,
      element: WebDriver | WebElement | WebElementWrapper = driver,
      timeout: number = defaultFindTimeout
    ): Promise<string[]> {
      log.debug(`Find.byButtonText('${buttonText}') with timeout=${timeout}`);
      return await retry.tryForTime(timeout, async () => {
        // tslint:disable-next-line:variable-name
        const _element = element instanceof WebElementWrapper ? element._webElement : element;
        await this._withTimeout(0);
        const allButtons = wrapAll(await _element.findElements(By.tagName('button')));
        await this._withTimeout(defaultFindTimeout);
        const buttonTexts = await Promise.all(
          allButtons.map(async (el) => {
            return el.getVisibleText();
          })
        );
        return buttonTexts.filter((text) => text.trim() === buttonText.trim());
      });
    }

    public async allByCssSelector(
      selector: string,
      timeout: number = defaultFindTimeout
    ): Promise<WebElementWrapper[]> {
      log.debug(`Find.allByCssSelector('${selector}') with timeout=${timeout}`);
      await this._withTimeout(timeout);
      const elements = await driver.findElements(By.css(selector));
      await this._withTimeout(defaultFindTimeout);
      return wrapAll(elements);
    }

    public async descendantExistsByCssSelector(
      selector: string,
      parentElement: WebElementWrapper,
      timeout: number = WAIT_FOR_EXISTS_TIME
    ): Promise<boolean> {
      log.debug(`Find.descendantExistsByCssSelector('${selector}') with timeout=${timeout}`);
      const els = await parentElement._webElement.findElements(By.css(selector));
      return await this.exists(async () => wrapAll(els), timeout);
    }

    public async descendantDisplayedByCssSelector(
      selector: string,
      parentElement: WebElementWrapper
    ): Promise<WebElementWrapper | never> {
      log.debug(`Find.descendantDisplayedByCssSelector('${selector}')`);
      const element = await parentElement._webElement.findElement(By.css(selector));
      const descendant = wrap(element, By.css(selector));
      const isDisplayed = await descendant.isDisplayed();
      if (isDisplayed) {
        return descendant;
      } else {
        throw new Error(`Element "${selector}" is not displayed`);
      }
    }

    public async allDescendantDisplayedByCssSelector(
      selector: string,
      parentElement: WebElementWrapper
    ): Promise<WebElementWrapper[]> {
      log.debug(`Find.allDescendantDisplayedByCssSelector('${selector}')`);
      const allElements = await wrapAll(
        await parentElement._webElement.findElements(By.css(selector))
      );
      return await this.filterElementIsDisplayed(allElements);
    }

    public async allDescendantDisplayedByTagName(
      tagName: string,
      parentElement: WebElementWrapper
    ): Promise<WebElementWrapper[]> {
      log.debug(`Find.allDescendantDisplayedByTagName('${tagName}')`);
      const allElements = await wrapAll(
        await parentElement._webElement.findElements(By.tagName(tagName))
      );
      return await this.filterElementIsDisplayed(allElements);
    }

    public async displayedByLinkText(
      linkText: string,
      timeout: number = defaultFindTimeout
    ): Promise<WebElementWrapper> {
      log.debug(`Find.displayedByLinkText('${linkText}') with timeout=${timeout}`);
      const element = await this.byLinkText(linkText, timeout);
      log.debug(`Wait for element become visible: ${linkText} with timeout=${timeout}`);
      await driver.wait(until.elementIsVisible(element._webElement), timeout);
      return wrap(element, By.linkText(linkText));
    }

    public async displayedByCssSelector(
      selector: string,
      timeout: number = defaultFindTimeout
    ): Promise<WebElementWrapper> {
      log.debug(`Find.displayedByCssSelector(${selector})`);
      const element = await this.byCssSelector(selector, timeout);
      log.debug(`Wait for element become visible: ${selector} with timeout=${timeout}`);
      await driver.wait(until.elementIsVisible(element._webElement), timeout);
      return wrap(element, By.css(selector));
    }

    public async byLinkText(
      selector: string,
      timeout: number = defaultFindTimeout
    ): Promise<WebElementWrapper> {
      log.debug(`Find.byLinkText('${selector}') with timeout=${timeout}`);
      return findAndWrap(By.linkText(selector), timeout);
    }

    public async byPartialLinkText(
      partialLinkText: string,
      timeout: number = defaultFindTimeout
    ): Promise<WebElementWrapper> {
      log.debug(`Find.byPartialLinkText('${partialLinkText}')  with timeout=${timeout}`);
      return findAndWrap(By.partialLinkText(partialLinkText), timeout);
    }

    public async exists(
      findFunction: (
        el: WebDriver
      ) =>
        | WebElementWrapper
        | WebElementWrapper[]
        | Promise<WebElementWrapper[]>
        | Promise<WebElementWrapper>,
      timeout: number = WAIT_FOR_EXISTS_TIME
    ): Promise<boolean> {
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

    public async existsByLinkText(
      linkText: string,
      timeout: number = WAIT_FOR_EXISTS_TIME
    ): Promise<boolean> {
      log.debug(`Find.existsByLinkText('${linkText}')  with timeout=${timeout}`);
      return await this.exists(
        async (drive) => wrapAll(await drive.findElements(By.linkText(linkText))),
        timeout
      );
    }

    public async existsByDisplayedByCssSelector(
      selector: string,
      timeout: number = WAIT_FOR_EXISTS_TIME
    ): Promise<boolean> {
      log.debug(`Find.existsByDisplayedByCssSelector('${selector}') with timeout=${timeout}`);
      try {
        await retry.tryForTime(timeout, async () => {
          // make sure that the find timeout is not longer than the retry timeout
          await this._withTimeout(Math.min(timeout, WAIT_FOR_EXISTS_TIME));
          const elements = await driver.findElements(By.css(selector));
          await this._withTimeout(defaultFindTimeout);
          const displayed = await this.filterElementIsDisplayed(wrapAll(elements));
          if (displayed.length === 0) {
            throw new Error(`${selector} is not displayed`);
          }
        });
      } catch (err) {
        await this._withTimeout(defaultFindTimeout);
        return false;
      }
      return true;
    }

    public async existsByCssSelector(
      selector: string,
      timeout: number = WAIT_FOR_EXISTS_TIME
    ): Promise<boolean> {
      log.debug(`Find.existsByCssSelector('${selector}') with timeout=${timeout}`);
      return await this.exists(async (drive) => {
        return wrapAll(await drive.findElements(By.css(selector)));
      }, timeout);
    }

    public async clickByCssSelectorWhenNotDisabled(
      selector: string,
      { timeout } = { timeout: defaultFindTimeout }
    ): Promise<void> {
      log.debug(`Find.clickByCssSelectorWhenNotDisabled('${selector}') with timeout=${timeout}`);

      // Don't wrap this code in a retry, or stale element checks may get caught here and the element
      // will never be re-grabbed.  Let errors bubble, but continue checking for disabled property until
      // it's gone.
      const element = await this.byCssSelector(selector, timeout);
      await element.moveMouseTo();
      await driver.wait(until.elementIsEnabled(element._webElement), timeout);
      await element.click();
    }

    public async clickByPartialLinkText(
      linkText: string,
      timeout: number = defaultFindTimeout
    ): Promise<void> {
      log.debug(`Find.clickByPartialLinkText('${linkText}') with timeout=${timeout}`);
      await retry.try(async () => {
        const element = await this.byPartialLinkText(linkText, timeout);
        await element.moveMouseTo();
        await element.click();
      });
    }

    public async clickByLinkText(
      linkText: string,
      timeout: number = defaultFindTimeout
    ): Promise<void> {
      log.debug(`Find.clickByLinkText('${linkText}') with timeout=${timeout}`);
      await retry.try(async () => {
        const element = await this.byLinkText(linkText, timeout);
        await element.moveMouseTo();
        await element.click();
      });
    }

    public async byButtonText(
      buttonText: string,
      element: WebDriver | WebElement | WebElementWrapper = driver,
      timeout: number = defaultFindTimeout
    ): Promise<WebElementWrapper> {
      log.debug(`Find.byButtonText('${buttonText}') with timeout=${timeout}`);
      return await retry.tryForTime(timeout, async () => {
        // tslint:disable-next-line:variable-name
        const _element = element instanceof WebElementWrapper ? element._webElement : element;
        const allButtons = wrapAll(await _element.findElements(By.tagName('button')));
        const buttonTexts = await Promise.all(
          allButtons.map(async (el) => {
            return el.getVisibleText();
          })
        );
        const index = buttonTexts.findIndex((text) => text.trim() === buttonText.trim());
        if (index === -1) {
          throw new Error('Button not found');
        }
        return allButtons[index];
      });
    }

    public async clickByButtonText(
      buttonText: string,
      element: WebDriver | WebElement | WebElementWrapper = driver,
      timeout: number = defaultFindTimeout
    ): Promise<void> {
      log.debug(`Find.clickByButtonText('${buttonText}') with timeout=${timeout}`);
      await retry.try(async () => {
        const button = await this.byButtonText(buttonText, element, timeout);
        await button.click();
      });
    }

    public async clickByCssSelector(
      selector: string,
      timeout: number = defaultFindTimeout
    ): Promise<void> {
      log.debug(`Find.clickByCssSelector('${selector}') with timeout=${timeout}`);
      await retry.try(async () => {
        const element = await this.byCssSelector(selector, timeout);
        if (element) {
          // await element.moveMouseTo();
          await element.click();
        } else {
          throw new Error(`Element with css='${selector}' is not found`);
        }
      });
    }

    public async clickByDisplayedLinkText(
      linkText: string,
      timeout: number = defaultFindTimeout
    ): Promise<void> {
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

    public async clickDisplayedByCssSelector(
      selector: string,
      timeout: number = defaultFindTimeout
    ) {
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

    public async waitForDeletedByCssSelector(
      selector: string,
      timeout: number = defaultFindTimeout
    ) {
      log.debug(`Find.waitForDeletedByCssSelector('${selector}') with timeout=${timeout}`);
      await this._withTimeout(POLLING_TIME);
      await driver.wait(
        async () => {
          const found = await driver.findElements(By.css(selector));
          return found.length === 0;
        },
        timeout,
        `The element ${selector} was still present when it should have disappeared.`
      );
      await this._withTimeout(defaultFindTimeout);
    }

    public async waitForAttributeToChange(
      selector: string,
      attribute: string,
      value: string
    ): Promise<void> {
      log.debug(`Find.waitForAttributeToChange('${selector}', '${attribute}', '${value}')`);
      await retry.waitFor(`${attribute} to equal "${value}"`, async () => {
        const el = await this.byCssSelector(selector);
        return value === (await el.getAttribute(attribute));
      });
    }

    public async waitForElementStale(
      element: WebElementWrapper,
      timeout: number = defaultFindTimeout
    ): Promise<void> {
      log.debug(`Find.waitForElementStale with timeout=${timeout}`);
      await driver.wait(until.stalenessOf(element._webElement), timeout);
    }

    public async waitForElementHidden(
      element: WebElementWrapper,
      timeout: number = defaultFindTimeout
    ) {
      log.debug(`Find.waitForElementHidden with timeout=${timeout}`);
      await driver.wait(until.elementIsNotVisible(element._webElement), timeout);
    }

    private async _withTimeout(timeout: number) {
      if (timeout !== this.currentWait) {
        this.currentWait = timeout;
        await driver.manage().setTimeouts({ implicit: timeout });
      }
    }
  }

  return new Find();
}
