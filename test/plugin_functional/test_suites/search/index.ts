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

import { FtrProviderContext } from 'test/functional/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function({ getService, getPageObjects, loadTestFile }: FtrProviderContext) {
  const browser = getService('browser');
  const appsMenu = getService('appsMenu');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'header']);

  describe('search services', function() {
    before(async () => {
      await esArchiver.loadIfNeeded('../functional/fixtures/es_archiver/dashboard/current/data');
      await esArchiver.load('../functional/fixtures/es_archiver/dashboard/current/kibana');
      await kibanaServer.uiSettings.replace({
        'dateFormat:tz': 'Australia/North',
        defaultIndex: 'logstash-*',
      });
      await browser.setWindowSize(1300, 900);
      await PageObjects.common.navigateToApp('settings');
      await appsMenu.clickLink('Search Explorer');
    });

    after(async function() {
      await esArchiver.unload('../functional/fixtures/es_archiver/dashboard/current/data');
      await esArchiver.unload('../functional/fixtures/es_archiver/dashboard/current/kibana');
    });

    loadTestFile(require.resolve('./demo_data'));
    loadTestFile(require.resolve('./es_search'));
  });
}
