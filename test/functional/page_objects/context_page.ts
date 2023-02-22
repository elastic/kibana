/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import rison from '@kbn/rison';
import { getUrl } from '@kbn/test';
import { FtrService } from '../ftr_provider_context';

const DEFAULT_INITIAL_STATE = {
  columns: ['@message'],
};

export class ContextPageObject extends FtrService {
  private readonly browser = this.ctx.getService('browser');
  private readonly config = this.ctx.getService('config');
  private readonly retry = this.ctx.getService('retry');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly header = this.ctx.getPageObject('header');
  private readonly common = this.ctx.getPageObject('common');
  private readonly log = this.ctx.getService('log');

  public async navigateTo(indexPattern: string, anchorId: string, overrideInitialState = {}) {
    const initialState = rison.encode({
      ...DEFAULT_INITIAL_STATE,
      ...overrideInitialState,
    });
    const contextHash = this.config.get('apps.context.hash');
    const appUrl = getUrl.noAuth(this.config.get('servers.kibana'), {
      ...this.config.get('apps.context'),
      hash: `${contextHash}/${indexPattern}/${anchorId}?_a=${initialState}`,
    });

    this.log.debug(`browser.get(${appUrl})`);

    await this.browser.get(appUrl);
    await this.header.awaitGlobalLoadingIndicatorHidden();
    await this.waitUntilContextLoadingHasFinished();
    // For lack of a better way, using a sleep to ensure page is loaded before proceeding
    await this.common.sleep(1000);
  }

  public async getPredecessorCountPicker() {
    return await this.testSubjects.find('predecessorsCountPicker');
  }

  public async getSuccessorCountPicker() {
    return await this.testSubjects.find('successorsCountPicker');
  }

  public async getPredecessorLoadMoreButton() {
    return await this.testSubjects.find('predecessorsLoadMoreButton');
  }

  public async getSuccessorLoadMoreButton() {
    return await this.testSubjects.find('successorsLoadMoreButton');
  }

  public async clickPredecessorLoadMoreButton() {
    this.log.debug('Click Predecessor Load More Button');
    await this.retry.try(async () => {
      const predecessorButton = await this.getPredecessorLoadMoreButton();
      await predecessorButton.click();
    });
    await this.waitUntilContextLoadingHasFinished();
    await this.header.waitUntilLoadingHasFinished();
  }

  public async clickSuccessorLoadMoreButton() {
    this.log.debug('Click Successor Load More Button');
    await this.retry.try(async () => {
      const sucessorButton = await this.getSuccessorLoadMoreButton();
      await sucessorButton.click();
    });
    await this.waitUntilContextLoadingHasFinished();
    await this.header.waitUntilLoadingHasFinished();
  }

  public async waitUntilContextLoadingHasFinished() {
    return await this.retry.try(async () => {
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
