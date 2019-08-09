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

export default function ({ getService, getPageObjects, loadTestFile }) {
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['common']);
  const kibanaServer = getService('kibanaServer');

  describe('context app', function () {
    this.tags('ciGroup1');

    before(async function () {
      await browser.setWindowSize(1200, 800);
      await esArchiver.loadIfNeeded('logstash_functional');
      await esArchiver.load('visualize');
      await kibanaServer.uiSettings.replace({ 'defaultIndex': 'logstash-*' });
      await PageObjects.common.navigateToApp('discover');
    });

    after(function unloadMakelogs() {
      return esArchiver.unload('logstash_functional');
    });

    loadTestFile(require.resolve('./_discover_navigation'));
    loadTestFile(require.resolve('./_filters'));
    loadTestFile(require.resolve('./_size'));
    loadTestFile(require.resolve('./_date_nanos'));
  });

}
