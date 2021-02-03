/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import rison from 'rison-node';
import { getUrl } from '@kbn/test';
import { FtrProviderContext } from '../ftr_provider_context';

const DEFAULT_INITIAL_STATE = {
  columns: ['@message'],
};

export function ContextPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const config = getService('config');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['header', 'common']);
  const log = getService('log');

  class ContextPage {
    public async navigateTo(indexPattern: string, anchorId: string, overrideInitialState = {}) {
      const initialState = rison.encode({
        ...DEFAULT_INITIAL_STATE,
        ...overrideInitialState,
      });
      const appUrl = getUrl.noAuth(config.get('servers.kibana'), {
        ...config.get('apps.context'),
        hash: `${config.get('apps.context.hash')}/${indexPattern}/${anchorId}?_a=${initialState}`,
      });

      log.debug(`browser.get(${appUrl})`);

      await browser.get(appUrl);
      await PageObjects.header.awaitGlobalLoadingIndicatorHidden();
      await this.waitUntilContextLoadingHasFinished();
      // For lack of a better way, using a sleep to ensure page is loaded before proceeding
      await PageObjects.common.sleep(1000);
    }

    public async getPredecessorCountPicker() {
      return await testSubjects.find('predecessorsCountPicker');
    }

    public async getSuccessorCountPicker() {
      return await testSubjects.find('successorsCountPicker');
    }

    public async getPredecessorLoadMoreButton() {
      return await testSubjects.find('predecessorsLoadMoreButton');
    }

    public async getSuccessorLoadMoreButton() {
      return await testSubjects.find('successorsLoadMoreButton');
    }

    public async clickPredecessorLoadMoreButton() {
      log.debug('Click Predecessor Load More Button');
      await retry.try(async () => {
        const predecessorButton = await this.getPredecessorLoadMoreButton();
        await predecessorButton.click();
      });
      await this.waitUntilContextLoadingHasFinished();
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    public async clickSuccessorLoadMoreButton() {
      log.debug('Click Successor Load More Button');
      await retry.try(async () => {
        const sucessorButton = await this.getSuccessorLoadMoreButton();
        await sucessorButton.click();
      });
      await this.waitUntilContextLoadingHasFinished();
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    public async waitUntilContextLoadingHasFinished() {
      return await retry.try(async () => {
        const successorLoadMoreButton = await this.getSuccessorLoadMoreButton();
        const predecessorLoadMoreButton = await this.getPredecessorLoadMoreButton();
        if (
          !(
            (await successorLoadMoreButton.isEnabled()) &&
            (await successorLoadMoreButton.isDisplayed()) &&
            (await predecessorLoadMoreButton.isEnabled()) &&
            (await predecessorLoadMoreButton.isDisplayed())
          )
        ) {
          throw new Error('loading context rows');
        }
      });
    }
  }

  return new ContextPage();
}
