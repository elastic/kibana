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

import { postSnapshot } from '@percy/agent/dist/utils/sdk-utils';
import { Test } from 'mocha';

import testSubjSelector from '@kbn/test-subj-selector';

import { pkg } from '../../../../src/core/server/utils';
import { FtrProviderContext } from '../../ftr_provider_context';

// @ts-ignore internal js that is passed to the browser as is
import { takePercySnapshot, takePercySnapshotWithAgent } from './take_percy_snapshot';

export const DEFAULT_OPTIONS = {
  widths: [1200],
};

export interface SnapshotOptions {
  /**
   * name to append to visual test name
   */
  name?: string;
  /**
   * test subject selectiors to __show__ in screenshot
   */
  show?: string[];
  /**
   * test subject selectiors to __hide__ in screenshot
   */
  hide?: string[];
}

export async function VisualTestingProvider({ getService }: FtrProviderContext) {
  const browser = getService('browser');
  const log = getService('log');
  const lifecycle = getService('lifecycle');

  let currentTest: Test | undefined;
  lifecycle.beforeEachTest.add((test) => {
    currentTest = test;
  });

  const statsCache = new WeakMap<Test, { snapshotCount: number }>();
  function getStats(test: Test) {
    if (!statsCache.has(test)) {
      statsCache.set(test, {
        snapshotCount: 0,
      });
    }

    return statsCache.get(test)!;
  }

  return new (class VisualTesting {
    public async snapshot(options: SnapshotOptions = {}) {
      if (process.env.DISABLE_VISUAL_TESTING) {
        log.warning(
          'Capturing of percy snapshots disabled, would normally capture a snapshot here!'
        );
        return;
      }

      log.debug('Capturing percy snapshot');

      if (!currentTest) {
        throw new Error('unable to determine current test');
      }

      const [domSnapshot, url] = await Promise.all([
        this.getSnapshot(options.show, options.hide),
        browser.getCurrentUrl(),
      ]);
      const stats = getStats(currentTest);
      stats.snapshotCount += 1;

      const { name } = options;
      const success = await postSnapshot({
        name: `${currentTest.fullTitle()} [${name ? name : stats.snapshotCount}]`,
        url,
        domSnapshot,
        clientInfo: `kibana-ftr:${pkg.version}`,
        ...DEFAULT_OPTIONS,
      });

      if (!success) {
        throw new Error('Percy snapshot failed');
      }
    }

    private async getSnapshot(show: string[] = [], hide: string[] = []) {
      const showSelectors = show.map(testSubjSelector);
      const hideSelectors = hide.map(testSubjSelector);
      const snapshot = await browser.execute<[string[], string[]], string | false>(
        takePercySnapshot,
        showSelectors,
        hideSelectors
      );
      return snapshot !== false
        ? snapshot
        : await browser.execute<[string[], string[]], string>(
            takePercySnapshotWithAgent,
            showSelectors,
            hideSelectors
          );
    }
  })();
}
