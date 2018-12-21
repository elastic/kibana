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

import {
  startServers,
  stopServers,
} from './lib';

import { docExistsSuite } from './doc_exists';
import { docMissingSuite } from './doc_missing';
import { docMissingAndIndexReadOnlySuite } from './doc_missing_and_index_read_only';
import { indexMissingSuite } from './index_missing';

describe('uiSettings/routes', function () {
  /**
   *  The "doc missing" and "index missing" tests verify how the uiSettings
   *  API behaves in between healthChecks, so they interact with the healthCheck
   *  in somewhat weird ways (can't wait until we get to https://github.com/elastic/kibana/issues/14163)
   *
   *  To make this work we have a `waitUntilNextHealthCheck()` function in ./lib/servers.js
   *  that deletes the kibana index and then calls `plugins.elasticsearch.waitUntilReady()`.
   *
   *  waitUntilReady() waits for the kibana index to exist and then for the
   *  elasticsearch plugin to go green. Since we have verified that the kibana index
   *  does not exist we know that the plugin will also turn yellow while waiting for
   *  it and then green once the health check is complete, ensuring that we run our
   *  tests right after the health check. All of this is to say that the tests are
   *  stupidly fragile and timing sensitive. #14163 should fix that, but until then
   *  this is the most stable way I've been able to get this to work.
   */
  this.slow(2000);
  this.timeout(10000);

  before(startServers);
  describe('index missing', indexMissingSuite);
  describe('doc missing', docMissingSuite);
  describe('doc missing and index readonly', docMissingAndIndexReadOnlySuite);
  describe('doc exists', docExistsSuite);
  after(stopServers);
});
