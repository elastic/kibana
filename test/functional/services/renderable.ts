/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrService } from '../ftr_provider_context';

const RENDER_COMPLETE_SELECTOR = '[data-render-complete="true"]';
const RENDER_COMPLETE_PENDING_SELECTOR = '[data-render-complete="false"]';
const DATA_LOADING_SELECTOR = '[data-loading]';

export class RenderableService extends FtrService {
  private readonly log = this.ctx.getService('log');
  private readonly retry = this.ctx.getService('retry');
  private readonly find = this.ctx.getService('find');

  /**
   * This method waits for a certain number of objects to finish rendering and loading, which is indicated
   * by a couple tags. The RENDER_COMPLETE_SELECTOR indicates that it's done initially loading up. Some
   * visualizations also add a DATA_LOADING_SELECTOR when the internal data is loading. This test will not
   * return if any of those tags are found.
   * @param count {Number} Number of RENDER_COMPLETE_SELECTORs to wait for.
   */
  public async waitForRender(count: number = 1): Promise<void> {
    this.log.debug(`Renderable.waitForRender for ${count} elements`);
    await this.retry.try(async () => {
      const completedElements = await this.find.allByCssSelector(RENDER_COMPLETE_SELECTOR);
      if (completedElements.length < count) {
        const pendingElements = await this.find.allByCssSelector(RENDER_COMPLETE_PENDING_SELECTOR);
        const pendingElementNames = [];
        for (const pendingElement of pendingElements) {
          const title = await pendingElement.getAttribute('data-title');
          pendingElementNames.push(title);
        }
        throw new Error(`${
          completedElements.length
        } elements completed rendering, still waiting on a total of ${count}
                specifically:\n${pendingElementNames.join('\n')}`);
      }

      const stillLoadingElements = await this.find.allByCssSelector(DATA_LOADING_SELECTOR, 1000);
      if (stillLoadingElements.length > 0) {
        throw new Error(`${stillLoadingElements.length} elements still loading contents`);
      }
    });
  }

  public async getRenderCount(count: number = 1): Promise<Record<string, number>> {
    const map: Record<string, number> = {};
    await this.waitForRender(count);

    const renderedElements = await this.find.allByCssSelector(RENDER_COMPLETE_SELECTOR);

    for (let i = 0; i < renderedElements.length; i++) {
      const renderedElement = renderedElements[i];
      const title = (await renderedElement.getAttribute('data-title')) || i.toString();
      const renderingCount = Number(
        (await renderedElement.getAttribute('data-rendering-count')) || '0'
      );

      map[title] = renderingCount;
    }

    return map;
  }
}
