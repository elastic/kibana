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

import { FtrProviderContext } from '../ftr_provider_context';

const RENDER_COMPLETE_SELECTOR = '[data-render-complete="true"]';
const RENDER_COMPLETE_PENDING_SELECTOR = '[data-render-complete="false"]';
const DATA_LOADING_SELECTOR = '[data-loading]';

export function RenderableProvider({ getService }: FtrProviderContext) {
  const log = getService('log');
  const retry = getService('retry');
  const find = getService('find');

  class Renderable {
    /**
     * This method waits for a certain number of objects to finish rendering and loading, which is indicated
     * by a couple tags. The RENDER_COMPLETE_SELECTOR indicates that it's done initially loading up. Some
     * visualizations also add a DATA_LOADING_SELECTOR when the internal data is loading. This test will not
     * return if any of those tags are found.
     * @param count {Number} Number of RENDER_COMPLETE_SELECTORs to wait for.
     */
    public async waitForRender(count: number = 1): Promise<void> {
      log.debug(`Renderable.waitForRender for ${count} elements`);
      await retry.try(async () => {
        const completedElements = await find.allByCssSelector(RENDER_COMPLETE_SELECTOR);
        if (completedElements.length < count) {
          const pendingElements = await find.allByCssSelector(RENDER_COMPLETE_PENDING_SELECTOR);
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

        const stillLoadingElements = await find.allByCssSelector(DATA_LOADING_SELECTOR, 1000);
        if (stillLoadingElements.length > 0) {
          throw new Error(`${stillLoadingElements.length} elements still loading contents`);
        }
      });
    }
  }

  return new Renderable();
}
