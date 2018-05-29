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
  const kibanaServer = getService('kibanaServer');
  const log = getService('log');
  const PageObjects = getPageObjects(['settings', 'common']);

  describe('index result popularity', function describeIndexTests() {
    before(function () {
      // delete .kibana index and then wait for Kibana to re-create it
      return kibanaServer.uiSettings.replace({})
        .then(function () {
          return PageObjects.settings.navigateTo();
        });
    });

    beforeEach(function be() {
      return PageObjects.settings.createIndexPattern();
    });

    afterEach(function ae() {
      return PageObjects.settings.removeIndexPattern();
    });

    describe('change popularity', function indexPatternCreation() {
      const fieldName = 'geo.coordinates';

      beforeEach(async function () {
        // increase Popularity of geo.coordinates
        log.debug('Starting openControlsByName (' + fieldName + ')');
        await PageObjects.settings.openControlsByName(fieldName);
        log.debug('increasePopularity');
        await PageObjects.settings.increasePopularity();
      });

      afterEach(async function () {
        // Cancel saving the popularity change (we didn't make a change in this case, just checking the value)
        await PageObjects.settings.controlChangeCancel();
      });

      it('should update the popularity input', async function () {
        const popularity = await PageObjects.settings.getPopularity();
        log.debug('popularity = ' + popularity);
        expect(popularity).to.be('1');
      });

      it('should be reset on cancel', async function () {
        // Cancel saving the popularity change
        await PageObjects.settings.controlChangeCancel();
        await PageObjects.settings.openControlsByName(fieldName);
        // check that it is 0 (previous increase was cancelled
        const popularity = await PageObjects.settings.getPopularity();
        log.debug('popularity = ' + popularity);
        expect(popularity).to.be('0');
      });

      it('can be saved', async function () {
        // Saving the popularity change
        await PageObjects.settings.controlChangeSave();
        await PageObjects.settings.openControlsByName(fieldName);
        const popularity = await PageObjects.settings.getPopularity();
        log.debug('popularity = ' + popularity);
        expect(popularity).to.be('1');
      });
    }); // end 'change popularity'
  }); // end index result popularity
}
