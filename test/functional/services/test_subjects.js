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
      log.debug(`doesTestSubjectExist ${selector}`);

      const exists = await remote
        .setFindTimeout(1000)
        .findDisplayedByCssSelector(testSubjSelector(selector))
        .then(() => true)
        .catch(() => false);

      remote.setFindTimeout(defaultFindTimeout);
      return exists;
    }

    async click(selector) {
      return await retry.try(async () => {
        await this.find(selector).click();
      });
    }

    find(selector, timeout = defaultFindTimeout) {
      log.debug('in findTestSubject: ' + testSubjSelector(selector));
      let originalFindTimeout = null;
      return remote
      .getFindTimeout()
      .then((findTimeout) => originalFindTimeout = findTimeout)
      .setFindTimeout(timeout)
      .findDisplayedByCssSelector(testSubjSelector(selector))
      .then(
        (result) => remote.setFindTimeout(originalFindTimeout)
          .finally(() => result),
        (error) => remote.setFindTimeout(originalFindTimeout)
          .finally(() => { throw error; }),
      );
    }

    async findAll(selector) {
      log.debug('in findAllTestSubjects: ' + testSubjSelector(selector));
      const all = await find.allByCssSelector(testSubjSelector(selector));
      return await filterAsync(all, el => el.isDisplayed());
    }

    async setValue(selector, value) {
      const input = await retry.try(() => this.find(selector));
      await retry.try(() => input.click());
      await input.clearValue();
      await input.type(value);
    }
  }

  return new TestSubjects();
}
