/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import rison from 'rison-node';

import getUrl from '../../../src/test_utils/get_url';

const DEFAULT_INITIAL_STATE = {
  columns: ['@message'],
};

export function ContextPageProvider({ getService, getPageObjects }) {
  const browser = getService('browser');
  const config = getService('config');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['header', 'common']);
  const log = getService('log');

  class ContextPage {
    async navigateTo(indexPattern, anchorId, overrideInitialState = {}) {
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

    async getPredecessorCountPicker() {
      return await testSubjects.find('predecessorsCountPicker');
    }

    async getSuccessorCountPicker() {
      return await testSubjects.find('successorsCountPicker');
    }

    async getPredecessorLoadMoreButton() {
      return await testSubjects.find('predecessorsLoadMoreButton');
    }

    async getSuccessorLoadMoreButton() {
      return await testSubjects.find('successorsLoadMoreButton');
    }

    async clickPredecessorLoadMoreButton() {
      log.debug('Click Predecessor Load More Button');
      await retry.try(async () => {
        const predecessorButton = await this.getPredecessorLoadMoreButton();
        await predecessorButton.click();
      });
      await this.waitUntilContextLoadingHasFinished();
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async clickSuccessorLoadMoreButton() {
      log.debug('Click Successor Load More Button');
      await retry.try(async () => {
        const sucessorButton = await this.getSuccessorLoadMoreButton();
        await sucessorButton.click();
      });
      await this.waitUntilContextLoadingHasFinished();
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async waitUntilContextLoadingHasFinished() {
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
