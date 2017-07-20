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

    getPredecessorCountPicker() {
      return testSubjects.find('predecessorCountPicker');
    }

    getSuccessorCountPicker() {
      return testSubjects.find('successorCountPicker');
    }

    getPredecessorLoadMoreButton() {
      return testSubjects.find('predecessorLoadMoreButton');
    }

    getSuccessorLoadMoreButton() {
      return testSubjects.find('predecessorLoadMoreButton');
    }

    waitUntilContextLoadingHasFinished() {
      return retry.try(async () => {
        if (
          !(await this.getSuccessorLoadMoreButton().isEnabled())
          || !(await this.getPredecessorLoadMoreButton().isEnabled())
        ) {
          throw new Error('loading context rows');
        }
      });
    }
  }

  return new ContextPage();
}
