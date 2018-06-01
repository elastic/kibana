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

import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'header', 'discover']);

  describe('source filters', function describeIndexTests() {
    before(function () {
      const fromTime = '2015-09-19 06:31:44.000';
      const toTime = '2015-09-23 18:31:44.000';

      // delete .kibana index and update configDoc
      return kibanaServer.uiSettings.replace({
        'dateFormat:tz': 'UTC',
        'defaultIndex': 'logstash-*'
      })
        .then(function loadkibanaIndexPattern() {
          log.debug('load kibana index with default index pattern');
          return esArchiver.load('visualize_source-filters');
        })
      // and load a set of makelogs data
        .then(function loadIfEmptyMakelogs() {
          return esArchiver.loadIfNeeded('logstash_functional');
        })
        .then(function () {
          log.debug('discover');
          return PageObjects.common.navigateToApp('discover');
        })
        .then(function () {
          log.debug('setAbsoluteRange');
          return PageObjects.header.setAbsoluteRange(fromTime, toTime);
        })
        .then(function () {
        //After hiding the time picker, we need to wait for
        //the refresh button to hide before clicking the share button
          return PageObjects.common.sleep(1000);
        });
    });

    it('should not get the field referer', function () {
      return PageObjects.discover.getAllFieldNames()
        .then(function (fieldNames) {
          expect(fieldNames).to.not.contain('referer');
          const relatedContentFields = fieldNames.filter((fieldName) => fieldName.indexOf('relatedContent') === 0);
          expect(relatedContentFields).to.have.length(0);
        });
    });
  });
}
