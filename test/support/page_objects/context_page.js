import rison from 'rison-node';

import { config } from '../';
import PageObjects from './';
import getUrl from '../../utils/get_url';


const DEFAULT_INITIAL_STATE = {
  columns: ['@message'],
};

export default class ContextPage {
  init(remote) {
    this.remote = remote;
  }

  async navigateTo(indexPattern, anchorType, anchorId, overrideInitialState = {}) {
    const initialState = rison.encode({
      ...DEFAULT_INITIAL_STATE,
      ...overrideInitialState,
    });
    const appUrl = getUrl.noAuth(config.servers.kibana, {
      ...config.apps.context,
      hash: `${config.apps.context.hash}/${indexPattern}/${anchorType}/${anchorId}?_a=${initialState}`,
    });

    await this.remote.get(appUrl);
    await this.remote.refresh();
    await this.waitUntilContextLoadingHasFinished();
  }

  getPredecessorCountPicker() {
    return PageObjects.common.findTestSubject('predecessorCountPicker');
  }

  getSuccessorCountPicker() {
    return PageObjects.common.findTestSubject('successorCountPicker');
  }

  getPredecessorLoadMoreButton() {
    return PageObjects.common.findTestSubject('predecessorLoadMoreButton');
  }

  getSuccessorLoadMoreButton() {
    return PageObjects.common.findTestSubject('predecessorLoadMoreButton');
  }

  waitUntilContextLoadingHasFinished() {
    return PageObjects.common.try(async () => {
      if (
        !(await this.getSuccessorLoadMoreButton().isEnabled())
        || !(await this.getPredecessorLoadMoreButton().isEnabled())
      ) {
        throw new Error('loading context rows');
      }
    });
  }
}
