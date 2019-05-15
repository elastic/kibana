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

import testSubjSelector from '@kbn/test-subj-selector';
import { map as mapAsync } from 'bluebird';
import { WebElementWrapper } from './lib/web_element_wrapper';
import { FtrProviderContext } from '../ftr_provider_context';

interface ExistsOptions {
  timeout?: number;
  allowHidden?: boolean;
}

export function TestSubjectsProvider({ getService }: FtrProviderContext) {
  const log = getService('log');
  const retry = getService('retry');
  const browser = getService('browser');
  const find = getService('find');
  const config = getService('config');

  const FIND_TIME = config.get('timeouts.find');
  const TRY_TIME = config.get('timeouts.try');
  const WAIT_FOR_EXISTS_TIME = config.get('timeouts.waitForExists');

  class TestSubjects {
    public async exists(selector: string, options: ExistsOptions = {}): Promise<boolean> {
      const { timeout = WAIT_FOR_EXISTS_TIME, allowHidden = false } = options;

      log.debug(`TestSubjects.exists(${selector})`);
      return await (allowHidden
        ? find.existsByCssSelector(testSubjSelector(selector), timeout)
        : find.existsByDisplayedByCssSelector(testSubjSelector(selector), timeout));
    }

    public async existOrFail(
      selector: string,
      existsOptions?: ExistsOptions
    ): Promise<void | never> {
      if (!(await this.exists(selector, { timeout: TRY_TIME, ...existsOptions }))) {
        throw new Error(`expected testSubject(${selector}) to exist`);
      }
    }

    public async missingOrFail(
      selector: string,
      existsOptions?: ExistsOptions
    ): Promise<void | never> {
      if (await this.exists(selector, existsOptions)) {
        throw new Error(`expected testSubject(${selector}) to not exist`);
      }
    }

    public async append(selector: string, text: string): Promise<void> {
      return await retry.try(async () => {
        log.debug(`TestSubjects.append(${selector}, ${text})`);
        const input = await this.find(selector);
        await input.click();
        await input.type(text);
      });
    }

    public async clickWhenNotDisabled(
      selector: string,
      { timeout = FIND_TIME }: { timeout?: number } = {}
    ): Promise<void> {
      log.debug(`TestSubjects.clickWhenNotDisabled(${selector})`);
      await find.clickByCssSelectorWhenNotDisabled(testSubjSelector(selector), { timeout });
    }

    public async click(selector: string, timeout: number = FIND_TIME): Promise<void> {
      log.debug(`TestSubjects.click(${selector})`);
      await find.clickByCssSelector(testSubjSelector(selector), timeout);
    }

    public async doubleClick(selector: string, timeout: number = FIND_TIME): Promise<void> {
      return await retry.try(async () => {
        log.debug(`TestSubjects.doubleClick(${selector})`);
        const element = await this.find(selector, timeout);
        await element.moveMouseTo();
        await browser.doubleClick(element);
      });
    }

    async descendantExists(selector: string, parentElement: WebElementWrapper): Promise<boolean> {
      log.debug(`TestSubjects.descendantExists(${selector})`);
      return await find.descendantExistsByCssSelector(testSubjSelector(selector), parentElement);
    }

    public async findDescendant(
      selector: string,
      parentElement: WebElementWrapper
    ): Promise<WebElementWrapper> {
      log.debug(`TestSubjects.findDescendant(${selector})`);
      return await find.descendantDisplayedByCssSelector(testSubjSelector(selector), parentElement);
    }

    public async findAllDescendant(
      selector: string,
      parentElement: WebElementWrapper
    ): Promise<WebElementWrapper[]> {
      log.debug(`TestSubjects.findAllDescendant(${selector})`);
      return await find.allDescendantDisplayedByCssSelector(
        testSubjSelector(selector),
        parentElement
      );
    }

    public async find(selector: string, timeout: number = FIND_TIME): Promise<WebElementWrapper> {
      log.debug(`TestSubjects.find(${selector})`);
      return await find.byCssSelector(testSubjSelector(selector), timeout);
    }

    public async findAll(selector: string, timeout?: number): Promise<WebElementWrapper[]> {
      return await retry.try(async () => {
        log.debug(`TestSubjects.findAll(${selector})`);
        const all = await find.allByCssSelector(testSubjSelector(selector), timeout);
        return await find.filterElementIsDisplayed(all);
      });
    }

    public async getPropertyAll(selector: string, property: string): Promise<string[]> {
      log.debug(`TestSubjects.getPropertyAll(${selector}, ${property})`);
      return await this._mapAll(selector, async (element: WebElementWrapper) => {
        return (await element.getProperty(property)) as string;
      });
    }

    public async getProperty(selector: string, property: string): Promise<string> {
      log.debug(`TestSubjects.getProperty(${selector}, ${property})`);
      return await retry.try(async () => {
        const element = await this.find(selector);
        return (await element.getProperty(property)) as string;
      });
    }

    public async getAttributeAll(selector: string, attribute: string): Promise<string[]> {
      log.debug(`TestSubjects.getAttributeAll(${selector}, ${attribute})`);
      return await this._mapAll(selector, async (element: WebElementWrapper) => {
        return await element.getAttribute(attribute);
      });
    }

    public async getAttribute(selector: string, attribute: string): Promise<string> {
      return await retry.try(async () => {
        log.debug(`TestSubjects.getAttribute(${selector}, ${attribute})`);
        const element = await this.find(selector);
        return await element.getAttribute(attribute);
      });
    }

    public async setValue(selector: string, text: string): Promise<void> {
      return await retry.try(async () => {
        log.debug(`TestSubjects.setValue(${selector}, ${text})`);
        await this.click(selector);
        // in case the input element is actually a child of the testSubject, we
        // call clearValue() and type() on the element that is focused after
        // clicking on the testSubject
        const input = await find.activeElement();
        await input.clearValue();
        await input.type(text);
      });
    }

    public async isEnabled(selector: string): Promise<boolean> {
      return await retry.try(async () => {
        log.debug(`TestSubjects.isEnabled(${selector})`);
        const element = await this.find(selector);
        return await element.isEnabled();
      });
    }

    public async isDisplayed(selector: string): Promise<boolean> {
      return await retry.try(async () => {
        log.debug(`TestSubjects.isDisplayed(${selector})`);
        const element = await this.find(selector);
        return await element.isDisplayed();
      });
    }

    public async isSelected(selector: string): Promise<boolean> {
      return await retry.try(async () => {
        log.debug(`TestSubjects.isSelected(${selector})`);
        const element = await this.find(selector);
        return await element.isSelected();
      });
    }

    public async isSelectedAll(selectorAll: string): Promise<boolean[]> {
      log.debug(`TestSubjects.isSelectedAll(${selectorAll})`);
      return await this._mapAll(selectorAll, async (element: WebElementWrapper) => {
        return await element.isSelected();
      });
    }

    public async getVisibleText(selector: string): Promise<string> {
      return await retry.try(async () => {
        log.debug(`TestSubjects.getVisibleText(${selector})`);
        const element = await this.find(selector);
        return await element.getVisibleText();
      });
    }

    async getVisibleTextAll(selectorAll: string): Promise<string[]> {
      log.debug(`TestSubjects.getVisibleTextAll(${selectorAll})`);
      return await this._mapAll(selectorAll, async (element: WebElementWrapper) => {
        return await element.getVisibleText();
      });
    }

    public async moveMouseTo(selector: string): Promise<void> {
      // Wrapped in a retry because even though the find should do a stale element check of it's own, we seem to
      // have run into a case where the element becomes stale after the find succeeds, throwing an error during the
      // moveMouseTo function.
      await retry.try(async () => {
        log.debug(`TestSubjects.moveMouseTo(${selector})`);
        const element = await this.find(selector);
        await element.moveMouseTo();
      });
    }

    private async _mapAll<T>(
      selectorAll: string,
      mapFn: (element: WebElementWrapper, index?: number, arrayLength?: number) => Promise<T>
    ): Promise<T[]> {
      return await retry.try(async () => {
        const elements = await this.findAll(selectorAll);
        return await mapAsync(elements, mapFn);
      });
    }

    public async waitForDeleted(selectorOrElement: string | WebElementWrapper): Promise<void> {
      if (typeof selectorOrElement === 'string') {
        await find.waitForDeletedByCssSelector(testSubjSelector(selectorOrElement));
      } else {
        await find.waitForElementStale(selectorOrElement);
      }
    }

    public async waitForAttributeToChange(
      selector: string,
      attribute: string,
      value: string
    ): Promise<void> {
      await find.waitForAttributeToChange(testSubjSelector(selector), attribute, value);
    }

    public getCssSelector(selector: string): string {
      return testSubjSelector(selector);
    }
  }

  return new TestSubjects();
}
