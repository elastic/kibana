import testSubjSelector from '@kbn/test-subj-selector';
import {
  filter as filterAsync,
  map as mapAsync,
} from 'bluebird';

export function TestSubjectsProvider({ getService }) {
  const log = getService('log');
  const retry = getService('retry');
  const remote = getService('remote');
  const find = getService('find');
  const config = getService('config');
  const defaultFindTimeout = config.get('timeouts.find');

  class TestSubjects {
    async exists(selector, timeout = 1000) {
      log.debug(`TestSubjects.exists(${selector})`);
      return await find.existsByDisplayedByCssSelector(testSubjSelector(selector), timeout);
    }

    async append(selector, text) {
      return await retry.try(async () => {
        const input = await this.find(selector);
        await input.click();
        await input.type(text);
      });
    }

    async click(selector, timeout = defaultFindTimeout) {
      log.debug(`TestSubjects.click(${selector})`);
      return await retry.try(async () => {
        const element = await this.find(selector, timeout);
        await remote.moveMouseTo(element);
        await element.click();
      });
    }

    async findDescendant(selector, parentElement) {
      return await find.descendantDisplayedByCssSelector(testSubjSelector(selector), parentElement);
    }

    async find(selector, timeout = 1000) {
      log.debug(`TestSubjects.find(${selector})`);
      return await find.byCssSelector(testSubjSelector(selector), timeout);
    }

    async findAll(selector) {
      log.debug(`TestSubjects.findAll(${selector})`);
      const all = await find.allByCssSelector(testSubjSelector(selector));
      return await filterAsync(all, el => el.isDisplayed());
    }

    async getPropertyAll(selector, property) {
      return await this._mapAll(selector, async (element) => {
        return await element.getProperty(property);
      });
    }

    async getProperty(selector, property) {
      return await retry.try(async () => {
        const element = await this.find(selector);
        return await element.getProperty(property);
      });
    }

    async getAttributeAll(selector, attribute) {
      return await this._mapAll(selector, async (element) => {
        return await element.getAttribute(attribute);
      });
    }

    async getAttribute(selector, attribute) {
      return await retry.try(async () => {
        const element = await this.find(selector);
        return await element.getAttribute(attribute);
      });
    }

    async setValue(selector, text) {
      return await retry.try(async () => {
        const element = await this.find(selector);
        await element.click();

        // in case the input element is actually a child of the testSubject, we
        // call clearValue() and type() on the element that is focused after
        // clicking on the testSubject
        const input = await remote.getActiveElement();
        await input.clearValue();
        await input.type(text);
      });
    }

    async isEnabled(selector) {
      return await retry.try(async () => {
        const element = await this.find(selector);
        return await element.isEnabled();
      });
    }

    async isSelected(selector) {
      return await retry.try(async () => {
        const element = await this.find(selector);
        return await element.isSelected();
      });
    }

    async isSelectedAll(selectorAll) {
      return await this._mapAll(selectorAll, async (element) => {
        return await element.isSelected();
      });
    }

    async getVisibleText(selector) {
      return await retry.try(async () => {
        const element = await this.find(selector);
        return await element.getVisibleText();
      });
    }

    async getVisibleTextAll(selectorAll) {
      return await this._mapAll(selectorAll, async (element) => {
        return await element.getVisibleText();
      });
    }

    async moveMouseTo(selector) {
      // Wrapped in a retry because even though the find should do a stale element check of it's own, we seem to
      // have run into a case where the element becomes stale after the find succeeds, throwing an error during the
      // moveMouseTo function.
      await retry.try(async () => {
        const element = await this.find(selector);
        await remote.moveMouseTo(element);
      });
    }

    async _mapAll(selectorAll, mapFn) {
      return await retry.try(async () => {
        const elements = await this.findAll(selectorAll);
        return await mapAsync(elements, mapFn);
      });
    }
  }

  return new TestSubjects();
}
