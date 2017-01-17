import rison from 'rison-node';

import { config } from '../';
import PageObjects from './';
import getUrl from '../../utils/get_url';


const DEFAULT_INITIAL_STATE = {
  columns: ['@message'],
};

export default class DiscoverPage {
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
  }

  async getDocTableHeaderTexts() {
    const tableHeaderElements = await this.remote.findAllByCssSelector(
      '[data-test-subj="docTable"] thead th'
    );
    const tableHeaderTexts = await Promise.all(tableHeaderElements.map(
      (tableHeaderElement) => tableHeaderElement.getVisibleText()
    ));

    return tableHeaderTexts;
  }
}
