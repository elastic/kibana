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
  const PageObjects = getPageObjects(['common', 'discover', 'header']);

  describe('discover tab', function describeIndexTests() {
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
          return esArchiver.load('discover');
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
        });
    });

    describe('field data', function () {
      it('should initially be expanded', function () {
        return PageObjects.discover.getSidebarWidth()
          .then(function (width) {
            log.debug('expanded sidebar width = ' + width);
            expect(width > 20).to.be(true);
          });
      });

      it('should collapse when clicked', function () {
        return PageObjects.discover.toggleSidebarCollapse()
          .then(function () {
            log.debug('PageObjects.discover.getSidebarWidth()');
            return PageObjects.discover.getSidebarWidth();
          })
          .then(function (width) {
            log.debug('collapsed sidebar width = ' + width);
            expect(width < 20).to.be(true);
          });
      });

      it('should expand when clicked', function () {
        return PageObjects.discover.toggleSidebarCollapse()
          .then(function () {
            log.debug('PageObjects.discover.getSidebarWidth()');
            return PageObjects.discover.getSidebarWidth();
          })
          .then(function (width) {
            log.debug('expanded sidebar width = ' + width);
            expect(width > 20).to.be(true);
          });
      });
    });
  });
}
