import rison from 'rison-node';

import getUrl from '../../../src/test_utils/get_url';

const DEFAULT_INITIAL_STATE = {
  columns: ['@message'],
};

export function ContextPageProvider({ getService }) {
  const remote = getService('remote');
  const config = getService('config');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');

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
      await remote.refresh();
      await this.waitUntilContextLoadingHasFinished();
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
      return await testSubjects.find('predecessorLoadMoreButton');
    }

    waitUntilContextLoadingHasFinished() {
      return retry.try(async () => {
        const successorLoadMoreButton = await this.getSuccessorLoadMoreButton();
        const predecessorLoadMoreButton = await this.getPredecessorLoadMoreButton();
        if (!successorLoadMoreButton.isEnabled() || !predecessorLoadMoreButton.isEnabled()) {
          throw new Error('loading context rows');
        }
      });
    }
  }

  return new ContextPage();
}
