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

import expect from '@kbn/expect';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'discover', 'timePicker']);

  describe('discover sidebar', function describeIndexTests() {
    before(async function () {

      // delete .kibana index and update configDoc
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'logstash-*',
      });

      log.debug('load kibana index with default index pattern');
      await esArchiver.load('discover');

      // and load a set of makelogs data
      await esArchiver.loadIfNeeded('logstash_functional');

      log.debug('discover');
      await PageObjects.common.navigateToApp('discover');

      await PageObjects.timePicker.setDefaultAbsoluteRange();
    });

    describe('field filtering', function () {
      it('should reveal and hide the filter form when the toggle is clicked', async function () {
        await PageObjects.discover.openSidebarFieldFilter();
        await PageObjects.discover.closeSidebarFieldFilter();
      });
    });

    describe('collapse expand', function () {
      it('should initially be expanded', async function () {
        const width = await PageObjects.discover.getSidebarWidth();
        log.debug('expanded sidebar width = ' + width);
        expect(width > 20).to.be(true);
      });

      it('should collapse when clicked', async function () {
        await PageObjects.discover.toggleSidebarCollapse();
        log.debug('PageObjects.discover.getSidebarWidth()');
        const width = await PageObjects.discover.getSidebarWidth();
        log.debug('collapsed sidebar width = ' + width);
        expect(width < 20).to.be(true);
      });

      it('should expand when clicked', async function () {
        await PageObjects.discover.toggleSidebarCollapse();

        log.debug('PageObjects.discover.getSidebarWidth()');
        const width = await PageObjects.discover.getSidebarWidth();
        log.debug('expanded sidebar width = ' + width);
        expect(width > 20).to.be(true);
      });
    });
  });
}
