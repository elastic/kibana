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

import execa from 'execa';
// @ts-ignore types not available yet
import { Eyes } from 'eyes.images';

import { Test } from 'mocha';

import { pkg } from '../../../../src/legacy/utils/package_json';
import { FtrProviderContext } from '../../ftr_provider_context';
import { FtrLogHandler } from './log_handler';

export async function ApplitoolsProvider({ getService }: FtrProviderContext) {
  const browser = getService('browser');
  const log = getService('log');
  const config = getService('config');
  const lifecycle = getService('lifecycle');

  if (!process.env.PERCY_TOKEN) {
    if (process.env.CI) {
      throw new Error('$PERCY_TOKEN not set, unable to run visual diff tests');
    }

    return {
      snapshotWindow() {
        log.warning('Applitools disabled because PERCY_TOKEN is not set');
      },
    };
  }

  const branchName = await execa.stdout('git', ['rev-parse', '--abbrev-ref', 'HEAD']);

  const eyes = new Eyes();
  eyes.setApiKey(process.env.PERCY_TOKEN);
  eyes.setHostingApp('Chrome');
  eyes.setBatch(process.env.PERCY_PARALLEL_NONCE, process.env.PERCY_PARALLEL_NONCE);
  eyes.setParentBranchName(pkg.branch);
  eyes.setBranchName(branchName);
  eyes.setLogHandler(new FtrLogHandler(log));

  lifecycle.on('beforeEachTest', async (test: Test) => {
    await eyes.open(config.get('junit.reportName'), test.fullTitle());
  });

  lifecycle.on('afterEachTest', async () => {
    await eyes.close(false);
  });

  return new class Applitools {
    public async snapshotWindow(name?: string) {
      const image = await browser.takeScreenshot();

      try {
        await eyes.checkImage(image, name);
        log.success('Applitools snapshot captured');
      } catch (error) {
        log.error(`Applitools error: ${error.message}`);
      }
    }
  }();
}
