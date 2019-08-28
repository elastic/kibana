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

import path from 'path';

export const KIBANA_ARCHIVE_PATH = path.resolve(__dirname, '../../../functional/fixtures/es_archiver/dashboard/current/kibana');
export const DATA_ARCHIVE_PATH = path.resolve(__dirname, '../../../functional/fixtures/es_archiver/dashboard/current/data');


export default function ({ getService, getPageObjects, loadTestFile }) {
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['dashboard']);

  // FLAKY: https://github.com/elastic/kibana/issues/41050
  describe.skip('pluggable panel actions', function () {
    before(async () => {
      await browser.setWindowSize(1300, 900);
      await PageObjects.dashboard.initTests({
        kibanaIndex: KIBANA_ARCHIVE_PATH,
        dataIndex: DATA_ARCHIVE_PATH,
        defaultIndex: 'logstash-*',
      });
      await PageObjects.dashboard.preserveCrossAppState();
    });

    after(async function () {
      await PageObjects.dashboard.clearSavedObjectsFromAppLinks();
      await esArchiver.unload(KIBANA_ARCHIVE_PATH);
      await esArchiver.unload(DATA_ARCHIVE_PATH);
    });

    loadTestFile(require.resolve('./panel_actions'));
  });
}
