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

import { FtrProviderContext } from '../../../ftr_provider_context.d';
import { UI_SETTINGS } from '../../../../../src/plugins/data/common';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const browser = getService('browser');
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  describe('visualize with legacy visualizations', () => {
    before(async () => {
      log.debug('Starting visualize legacy before method');
      await browser.setWindowSize(1280, 800);
      await esArchiver.loadIfNeeded('logstash_functional');
      await esArchiver.loadIfNeeded('long_window_logstash');
      await esArchiver.load('visualize');
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'logstash-*',
        [UI_SETTINGS.FORMAT_BYTES_DEFAULT_PATTERN]: '0,0.[000]b',
      });
    });

    describe('legacy data table visualization', function () {
      this.tags('ciGroup9');

      loadTestFile(require.resolve('./_data_table'));
    });
  });
}
