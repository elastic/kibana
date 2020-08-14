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
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');

  describe('discover app', function () {
    this.tags('ciGroup6');

    before(function () {
      return browser.setWindowSize(1300, 800);
    });

    after(function unloadMakelogs() {
      return esArchiver.unload('logstash_functional');
    });

    loadTestFile(require.resolve('./_saved_queries'));
    loadTestFile(require.resolve('./_discover'));
    loadTestFile(require.resolve('./_discover_histogram'));
    loadTestFile(require.resolve('./_doc_table'));
    loadTestFile(require.resolve('./_field_visualize'));
    loadTestFile(require.resolve('./_filter_editor'));
    loadTestFile(require.resolve('./_errors'));
    loadTestFile(require.resolve('./_field_data'));
    loadTestFile(require.resolve('./_shared_links'));
    loadTestFile(require.resolve('./_sidebar'));
    loadTestFile(require.resolve('./_source_filters'));
    loadTestFile(require.resolve('./_large_string'));
    loadTestFile(require.resolve('./_inspector'));
    loadTestFile(require.resolve('./_doc_navigation'));
    loadTestFile(require.resolve('./_date_nanos'));
    loadTestFile(require.resolve('./_date_nanos_mixed'));
    loadTestFile(require.resolve('./_indexpattern_without_timefield'));
  });
}
