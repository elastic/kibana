import rison from 'rison-node';

import getUrl from '../../../src/test_utils/get_url';

const DEFAULT_INITIAL_STATE = {
  columns: ['@message'],
};

export function ContextPageProvider({ getService, getPageObjects }) {
  const remote = getService('remote');
  const config = getService('config');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['header', 'common']);
  const log = getService('log');

  class ContextPage {
    async navigateTo(indexPattern, anchorType, anchorId, overrideInitialState = {}) {
      const initialState = rison.encode({
        ...DEFAULT_INITIAL_STATE,
        ...overrideInitialState,
      });
      const appUrl = getUrl.noAuth(config.get('servers.kibana'), {
        ...config.get('apps.context'),
        hash: `${config.get('apps.context.hash')}/${indexPattern}/${anchorType}/${anchorId}?_a=${initialState}`,
      });

      await remote.get(appUrl);
      await this.waitUntilContextLoadingHasFinished();
      // For lack of a better way, using a sleep to ensure page is loaded before proceeding
      await PageObjects.common.sleep(1000);
    }

    async getPredecessorCountPicker() {
      return await testSubjects.find('predecessorCountPicker');
    }

    async getSuccessorCountPicker() {
      return await testSubjects.find('successorCountPicker');
    }

    async getPredecessorLoadMoreButton() {
      return await testSubjects.find('predecessorLoadMoreButton');
    }

    async getSuccessorLoadMoreButton() {
      return await testSubjects.find('successorLoadMoreButton');
    }

    async clickPredecessorLoadMoreButton() {
      log.debug('Click Predecessor Load More Button');
      await retry.try(async () => {
        const predecessorButton = await this.getPredecessorLoadMoreButton();
        await predecessorButton.click();
      });
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickSuccessorLoadMoreButton() {
      log.debug('Click Successor Load More Button');
      await retry.try(async () => {
        const sucessorButton = await this.getSuccessorLoadMoreButton();
        await sucessorButton.click();
      });
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async waitUntilContextLoadingHasFinished() {
      return await retry.try(async () => {
        const successorLoadMoreButton = await this.getSuccessorLoadMoreButton();
        const predecessorLoadMoreButton = await this.getPredecessorLoadMoreButton();
        if (!(successorLoadMoreButton.isEnabled() && successorLoadMoreButton.isDisplayed() &&
              predecessorLoadMoreButton.isEnabled() && predecessorLoadMoreButton.isDisplayed())) {
          throw new Error('loading context rows');
        }
      });
    }

  }

  return new ContextPage();
}
