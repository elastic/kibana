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

import { postSnapshot } from '@percy/agent';
import { Test } from 'mocha';

import { pkg } from '../../../../src/legacy/utils/package_json';
import { FtrProviderContext } from '../../ftr_provider_context';

// @ts-ignore internal js that is passed to the browser as is
import { takePercySnapshot, takePercySnapshotWithAgent } from './take_percy_snapshot';

export async function VisualTestingProvider({ getService }: FtrProviderContext) {
  const browser = getService('browser');
  const log = getService('log');
  const lifecycle = getService('lifecycle');

  const DEFAULT_OPTIONS = {
    widths: [1200],
  };

  let currentTest: Test | undefined;
  lifecycle.on('beforeEachTest', (test: Test) => {
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

  return new class VisualTesting {
    public async snapshot(name?: string) {
      log.debug('Capturing percy snapshot');

      if (!currentTest) {
        throw new Error('unable to determine current test');
      }

      const [domSnapshot, url] = await Promise.all([this.getSnapshot(), browser.getCurrentUrl()]);

      const stats = getStats(currentTest);
      stats.snapshotCount += 1;

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

    private async getSnapshot() {
      const snapshot = await browser.execute<[], string | false>(takePercySnapshot);
      return snapshot !== false
        ? snapshot
        : await browser.execute<[], string>(takePercySnapshotWithAgent);
    }
  }();
}
