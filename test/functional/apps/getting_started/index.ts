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

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const browser = getService('browser');
  const kibanaServer = getService('kibanaServer');

  describe('Getting Started ', function () {
    this.tags(['ciGroup6']);

    before(async function () {
      await browser.setWindowSize(1200, 800);
    });

    // TODO: Remove when vislib is removed
    describe('new charts library', function () {
      before(async () => {
        await kibanaServer.uiSettings.update({
          'visualization:visualize:legacyChartsLibrary': false,
        });
        await browser.refresh();
      });

      after(async () => {
        await kibanaServer.uiSettings.update({
          'visualization:visualize:legacyChartsLibrary': true,
        });
        await browser.refresh();
      });

      loadTestFile(require.resolve('./_shakespeare'));
    });

    describe('', () => {
      loadTestFile(require.resolve('./_shakespeare'));
    });
  });
}
