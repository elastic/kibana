/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import testSubjSelector from '@kbn/test-subj-selector';
import { WebElementWrapper } from '../lib/web_element_wrapper';
import { FtrService } from '../../ftr_provider_context';

interface ExistsOptions {
  timeout?: number;
  allowHidden?: boolean;
}

interface SetValueOptions {
  clearWithKeyboard?: boolean;
  typeCharByChar?: boolean;
}

export class TestSubjects extends FtrService {
  public readonly log = this.ctx.getService('log');
  public readonly retry = this.ctx.getService('retry');
  public readonly findService = this.ctx.getService('find');
  public readonly config = this.ctx.getService('config');

  public readonly FIND_TIME = this.config.get('timeouts.find');
  public readonly TRY_TIME = this.config.get('timeouts.try');
  public readonly WAIT_FOR_EXISTS_TIME = this.config.get('timeouts.waitForExists');

  public async exists(selector: string, options: ExistsOptions = {}): Promise<boolean> {
    const { timeout = this.WAIT_FOR_EXISTS_TIME, allowHidden = false } = options;

    this.log.debug(`TestSubjects.exists(${selector})`);
    return await (allowHidden
      ? this.findService.existsByCssSelector(testSubjSelector(selector), timeout)
      : this.findService.existsByDisplayedByCssSelector(testSubjSelector(selector), timeout));
  }

  public async existOrFail(selector: string, existsOptions?: ExistsOptions): Promise<void | never> {
    if (!(await this.exists(selector, { timeout: this.TRY_TIME, ...existsOptions }))) {
      throw new Error(`expected testSubject(${selector}) to exist`);
    }
  }

  public async missingOrFail(selector: string, options: ExistsOptions = {}): Promise<void | never> {
    const { timeout = this.WAIT_FOR_EXISTS_TIME, allowHidden = false } = options;

    this.log.debug(`TestSubjects.missingOrFail(${selector})`);
    return await (allowHidden
      ? this.waitForHidden(selector, timeout)
      : this.findService.waitForDeletedByCssSelector(testSubjSelector(selector), timeout));
  }

  async stringExistsInCodeBlockOrFail(codeBlockSelector: string, stringToFind: string) {
    await this.retry.try(async () => {
      const responseCodeBlock = await this.find(codeBlockSelector);
      const spans = await this.findService.allDescendantDisplayedByTagName(
        'span',
        responseCodeBlock
      );
      const foundInSpans = await Promise.all(
        spans.map(async (span) => {
          const text = await span.getVisibleText();
          if (text === stringToFind) {
            this.log.debug(`"${text}" matched "${stringToFind}"!`);
            return true;
          } else {
            this.log.debug(`"${text}" did not match "${stringToFind}"`);
          }
        })
      );
      if (!foundInSpans.find((foundInSpan) => foundInSpan)) {
        throw new Error(`"${stringToFind}" was not found. Trying again...`);
      }
    });
  }

  public async append(selector: string, text: string): Promise<void> {
    this.log.debug(`TestSubjects.append(${selector}, ${text})`);
    const input = await this.find(selector);
    await input.click();
    await input.type(text);
  }

  public async clickWhenNotDisabled(
    selector: string,
    { timeout = this.FIND_TIME }: { timeout?: number } = {}
  ): Promise<void> {
    this.log.debug(`TestSubjects.clickWhenNotDisabled(${selector})`);
    await this.findService.clickByCssSelectorWhenNotDisabled(testSubjSelector(selector), {
      timeout,
    });
  }

  public async click(
    selector: string,
    timeout: number = this.FIND_TIME,
    topOffset?: number
  ): Promise<void> {
    this.log.debug(`TestSubjects.click(${selector})`);
    await this.findService.clickByCssSelector(testSubjSelector(selector), timeout, topOffset);
  }

  public async clickWithRetries(
    selector: string,
    retries: number,
    timeout: number = this.FIND_TIME,
    topOffset?: number
  ): Promise<void> {
    this.log.debug(`TestSubjects.clickWithRetries(${selector})`);
    await this.findService.clickByCssSelectorWithRetries(
      testSubjSelector(selector),
      timeout,
      topOffset,
      retries
    );
  }

  public async doubleClick(selector: string, timeout: number = this.FIND_TIME): Promise<void> {
    this.log.debug(`TestSubjects.doubleClick(${selector})`);
    const element = await this.find(selector, timeout);
    await element.moveMouseTo();
    await element.doubleClick();
  }

  async descendantExists(selector: string, parentElement: WebElementWrapper): Promise<boolean> {
    this.log.debug(`TestSubjects.descendantExists(${selector})`);
    return await this.findService.descendantExistsByCssSelector(
      testSubjSelector(selector),
      parentElement
    );
  }

  public async findDescendant(
    selector: string,
    parentElement: WebElementWrapper
  ): Promise<WebElementWrapper> {
    this.log.debug(`TestSubjects.findDescendant(${selector})`);
    return await this.findService.descendantDisplayedByCssSelector(
      testSubjSelector(selector),
      parentElement
    );
  }

  public async findAllDescendant(
    selector: string,
    parentElement: WebElementWrapper
  ): Promise<WebElementWrapper[]> {
    this.log.debug(`TestSubjects.findAllDescendant(${selector})`);
    return await this.findService.allDescendantDisplayedByCssSelector(
      testSubjSelector(selector),
      parentElement
    );
  }

  public async find(
    selector: string,
    timeout: number = this.FIND_TIME
  ): Promise<WebElementWrapper> {
    this.log.debug(`TestSubjects.find(${selector})`);
    return await this.findService.byCssSelector(testSubjSelector(selector), timeout);
  }

  public async findAll(selector: string, timeout?: number): Promise<WebElementWrapper[]> {
    return await this.retry.try(async () => {
      this.log.debug(`TestSubjects.findAll(${selector})`);
      const all = await this.findService.allByCssSelector(testSubjSelector(selector), timeout);
      return await this.findService.filterElementIsDisplayed(all);
    });
  }

  public async getAttributeAll(selector: string, attribute: string): Promise<string[]> {
    this.log.debug(`TestSubjects.getAttributeAll(${selector}, ${attribute})`);
    return await this._mapAll(selector, async (element: WebElementWrapper) => {
      return await element.getAttribute(attribute);
    });
  }

  public async getAttribute(
    selector: string,
    attribute: string,
    options?:
      | number
      | {
          findTimeout?: number;
          tryTimeout?: number;
        }
  ): Promise<string> {
    const findTimeout =
      (typeof options === 'number' ? options : options?.findTimeout) ??
      this.config.get('timeouts.find');

    const tryTimeout =
      (typeof options !== 'number' ? options?.tryTimeout : undefined) ??
      this.config.get('timeouts.try');

    this.log.debug(
      `TestSubjects.getAttribute(${selector}, ${attribute}, tryTimeout=${tryTimeout}, findTimeout=${findTimeout})`
    );

    return await this.retry.tryForTime(tryTimeout, async () => {
      const element = await this.find(selector, findTimeout);
      return await element.getAttribute(attribute);
    });
  }

  public async setValue(
    selector: string,
    text: string,
    options: SetValueOptions = {},
    topOffset?: number
  ): Promise<void> {
    return await this.retry.try(async () => {
      const { clearWithKeyboard = false, typeCharByChar = false } = options;
      this.log.debug(`TestSubjects.setValue(${selector}, ${text})`);
      await this.click(selector, undefined, topOffset);
      // in case the input element is actually a child of the testSubject, we
      // call clearValue() and type() on the element that is focused after
      // clicking on the testSubject
      const input = await this.findService.activeElement();
      if (clearWithKeyboard === true) {
        await input.clearValueWithKeyboard();
      } else {
        await input.clearValue();
      }
      await input.type(text, { charByChar: typeCharByChar });
    });
  }

  public async selectValue(selector: string, value: string): Promise<void> {
    await this.findService.selectValue(`[data-test-subj="${selector}"]`, value);
  }

  public async isEnabled(selector: string): Promise<boolean> {
    this.log.debug(`TestSubjects.isEnabled(${selector})`);
    const element = await this.find(selector);
    return await element.isEnabled();
  }

  public async isDisplayed(selector: string): Promise<boolean> {
    this.log.debug(`TestSubjects.isDisplayed(${selector})`);
    const element = await this.find(selector);
    return await element.isDisplayed();
  }

  public async isSelected(selector: string): Promise<boolean> {
    this.log.debug(`TestSubjects.isSelected(${selector})`);
    const element = await this.find(selector);
    return await element.isSelected();
  }

  public async isSelectedAll(selectorAll: string): Promise<boolean[]> {
    this.log.debug(`TestSubjects.isSelectedAll(${selectorAll})`);
    return await this._mapAll(selectorAll, async (element: WebElementWrapper) => {
      return await element.isSelected();
    });
  }

  public async getVisibleText(selector: string): Promise<string> {
    this.log.debug(`TestSubjects.getVisibleText(${selector})`);
    const element = await this.find(selector);
    return await element.getVisibleText();
  }

  async getVisibleTextAll(selectorAll: string): Promise<string[]> {
    this.log.debug(`TestSubjects.getVisibleTextAll(${selectorAll})`);
    return await this._mapAll(selectorAll, async (element: WebElementWrapper) => {
      return await element.getVisibleText();
    });
  }

  public async moveMouseTo(selector: string): Promise<void> {
    // Wrapped in a retry because even though the find should do a stale element check of it's own, we seem to
    // have run into a case where the element becomes stale after the find succeeds, throwing an error during the
    // moveMouseTo function.
    await this.retry.try(async () => {
      this.log.debug(`TestSubjects.moveMouseTo(${selector})`);
      const element = await this.find(selector);
      await element.moveMouseTo();
    });
  }

  private async _mapAll<T>(
    selectorAll: string,
    mapFn: (element: WebElementWrapper, index: number, array: WebElementWrapper[]) => Promise<T>
  ): Promise<T[]> {
    return await this.retry.try(async () => {
      const elements = await this.findAll(selectorAll);
      return await Promise.all(elements.map(mapFn));
    });
  }

  public async waitForDeleted(selectorOrElement: string | WebElementWrapper): Promise<void> {
    if (typeof selectorOrElement === 'string') {
      await this.findService.waitForDeletedByCssSelector(testSubjSelector(selectorOrElement));
    } else {
      await this.findService.waitForElementStale(selectorOrElement);
    }
  }

  public async waitForAttributeToChange(
    selector: string,
    attribute: string,
    value: string
  ): Promise<void> {
    await this.findService.waitForAttributeToChange(testSubjSelector(selector), attribute, value);
  }

  public async waitForHidden(selector: string, timeout?: number): Promise<void> {
    this.log.debug(`TestSubjects.waitForHidden(${selector})`);
    const element = await this.find(selector);
    await this.findService.waitForElementHidden(element, timeout);
  }

  public async waitForEnabled(selector: string, timeout: number = this.TRY_TIME): Promise<void> {
    await this.retry.tryForTime(timeout, async () => {
      const element = await this.find(selector);
      return (await element.isDisplayed()) && (await element.isEnabled());
    });
  }

  public getCssSelector(selector: string): string {
    return testSubjSelector(selector);
  }

  public async scrollIntoView(
    selector: string,
    offset?: number | { topOffset?: number; bottomOffset?: number }
  ) {
    const element = await this.find(selector);
    await element.scrollIntoViewIfNecessary(offset);
  }

  // isChecked always returns false when run on an euiSwitch, because they use the aria-checked attribute
  public async isChecked(selector: string) {
    const checkbox = await this.find(selector);
    return await checkbox.isSelected();
  }

  public async setCheckbox(selector: string, state: 'check' | 'uncheck') {
    const isChecked = await this.isChecked(selector);
    const states = { check: true, uncheck: false };
    if (isChecked !== states[state]) {
      this.log.debug(`updating checkbox ${selector} from ${isChecked} to ${states[state]}`);
      await this.click(selector);
    }
  }

  public async isEuiSwitchChecked(selector: string) {
    const euiSwitch = await this.find(selector);
    const isChecked = await euiSwitch.getAttribute('aria-checked');
    return isChecked === 'true';
  }

  public async setEuiSwitch(selector: string, state: 'check' | 'uncheck') {
    const isChecked = await this.isEuiSwitchChecked(selector);
    const states = { check: true, uncheck: false };
    if (isChecked !== states[state]) {
      this.log.debug(`updating checkbox ${selector} from ${isChecked} to ${states[state]}`);
      await this.click(selector);
    }
  }
}
