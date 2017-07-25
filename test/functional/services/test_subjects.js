import testSubjSelector from '@spalger/test-subj-selector';
import { filter as filterAsync } from 'bluebird';

export function TestSubjectsProvider({ getService }) {
  const log = getService('log');
  const retry = getService('retry');
  const remote = getService('remote');
  const find = getService('find');
  const config = getService('config');
  const defaultFindTimeout = config.get('timeouts.find');

  class TestSubjects {
    async exists(selector) {
      log.debug(`TestSubjects.exists(${selector})`);
      return await find.existsByDisplayedByCssSelector(testSubjSelector(selector));
    }

    async append(selector, text) {
      return await retry.try(async () => {
        const input = await this.find(selector);
        await input.click();
        await input.type(text);
      });
    }

    async click(selector) {
      return await retry.try(async () => {
        const element = await this.find(selector);
        await remote.moveMouseTo(element);
        await element.click();
      });
    }

    async find(selector, timeout = defaultFindTimeout) {
      log.debug(`TestSubjects.find(${selector})`);
      return await find.displayedByCssSelector(testSubjSelector(selector), timeout);
    }

    async findAll(selector) {
      log.debug(`TestSubjects.findAll(${selector})`);
      const all = await find.allByCssSelector(testSubjSelector(selector));
      return await filterAsync(all, el => el.isDisplayed());
    }

    async getProperty(selector, property) {
      return await retry.try(async () => {
        const element = await this.find(selector);
        return await element.getProperty(property);
      });
    }

    async setValue(selector, text) {
      return await retry.try(async () => {
        const input = await this.find(selector);
        await input.click();
        await input.clearValue();
        await input.type(text);
      });
    }

    async getVisibleText(selector) {
      return await retry.try(async () => {
        const element = await this.find(selector);
        return await element.getVisibleText();
      });
    }
  }

  return new TestSubjects();
}
