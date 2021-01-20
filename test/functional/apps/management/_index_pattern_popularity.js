/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';

export default function ({ getService, getPageObjects }) {
  const kibanaServer = getService('kibanaServer');
  const log = getService('log');
  const PageObjects = getPageObjects(['settings', 'common']);

  describe('index result popularity', function describeIndexTests() {
    const fieldName = 'geo.coordinates';
    before(async function () {
      // delete .kibana index and then wait for Kibana to re-create it
      await kibanaServer.uiSettings.replace({});
      await PageObjects.settings.navigateTo();
    });

    beforeEach(async () => {
      await PageObjects.settings.createIndexPattern();
      // increase Popularity of geo.coordinates
      log.debug('Starting openControlsByName (' + fieldName + ')');
      await PageObjects.settings.openControlsByName(fieldName);
      log.debug('increasePopularity');
      await PageObjects.settings.increasePopularity();
    });

    afterEach(async () => {
      await PageObjects.settings.controlChangeCancel();
      await PageObjects.settings.removeIndexPattern();
      // Cancel saving the popularity change (we didn't make a change in this case, just checking the value)
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
      expect(popularity).to.be('');
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
}
