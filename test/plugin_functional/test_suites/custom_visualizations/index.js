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

export default function ({ getService, loadTestFile }) {
  const remote = getService('remote');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  describe('custom visualizations', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('../functional/fixtures/es_archiver/logstash_functional');
      await esArchiver.loadIfNeeded('../functional/fixtures/es_archiver/visualize');
      await kibanaServer.uiSettings.replace({ 'dateFormat:tz': 'Australia/North', 'defaultIndex': 'logstash-*' });
      await remote.setWindowSize(1300, 900);
    });

    loadTestFile(require.resolve('./self_changing_vis'));
  });
}
