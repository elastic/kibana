/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'timePicker', 'discover']);

  describe('source filters', function describeIndexTests() {
    before(async function () {
      // delete .kibana index and update configDoc
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'logstash-*',
      });

      log.debug('load kibana index with default index pattern');
      await esArchiver.load('visualize_source-filters');

      // and load a set of makelogs data
      await esArchiver.loadIfNeeded('logstash_functional');

      await kibanaServer.uiSettings.update({
        'discover:searchFieldsFromSource': true,
      });

      log.debug('discover');
      await PageObjects.common.navigateToApp('discover');

      await PageObjects.timePicker.setDefaultAbsoluteRange();

      // After hiding the time picker, we need to wait for
      // the refresh button to hide before clicking the share button
      await PageObjects.common.sleep(1000);
    });

    it('should not get the field referer', async function () {
      const fieldNames = await PageObjects.discover.getAllFieldNames();
      expect(fieldNames).to.not.contain('referer');
      const relatedContentFields = fieldNames.filter(
        (fieldName) => fieldName.indexOf('relatedContent') === 0
      );
      expect(relatedContentFields).to.have.length(0);
    });
  });
}
