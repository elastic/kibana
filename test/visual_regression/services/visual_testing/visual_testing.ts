/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { postSnapshot } from '@percy/agent/dist/utils/sdk-utils';
import testSubjSelector from '@kbn/test-subj-selector';
import { Test } from '@kbn/test';
import { kibanaPackageJson as pkg } from '@kbn/utils';
import { FtrService, FtrProviderContext } from '../../ftr_provider_context';

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

const statsCache = new WeakMap<Test, { snapshotCount: number }>();

function getStats(test: Test) {
  if (!statsCache.has(test)) {
    statsCache.set(test, {
      snapshotCount: 0,
    });
  }

  return statsCache.get(test)!;
}

export class VisualTestingService extends FtrService {
  private readonly browser = this.ctx.getService('browser');
  private readonly log = this.ctx.getService('log');

  private currentTest: Test | undefined;

  constructor(ctx: FtrProviderContext) {
    super(ctx);

    this.ctx.getService('lifecycle').beforeEachTest.add((test) => {
      this.currentTest = test;
    });
  }

  public async snapshot(options: SnapshotOptions = {}) {
    if (process.env.DISABLE_VISUAL_TESTING) {
      this.log.warning(
        'Capturing of percy snapshots disabled, would normally capture a snapshot here!'
      );
      return;
    }

    this.log.debug('Capturing percy snapshot');

    if (!this.currentTest) {
      throw new Error('unable to determine current test');
    }

    const [domSnapshot, url] = await Promise.all([
      this.getSnapshot(options.show, options.hide),
      this.browser.getCurrentUrl(),
    ]);
    const stats = getStats(this.currentTest);
    stats.snapshotCount += 1;

    const { name } = options;
    const success = await postSnapshot({
      name: `${this.currentTest.fullTitle()} [${name ? name : stats.snapshotCount}]`,
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
    const snapshot = await this.browser.execute<[string[], string[]], string | false>(
      takePercySnapshot,
      showSelectors,
      hideSelectors
    );
    return snapshot !== false
      ? snapshot
      : await this.browser.execute<[string[], string[]], string>(
          takePercySnapshotWithAgent,
          showSelectors,
          hideSelectors
        );
  }
}
