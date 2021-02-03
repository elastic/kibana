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
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const filterBar = getService('filterBar');
  const PageObjects = getPageObjects(['common', 'discover', 'timePicker']);
  const defaultSettings = {
    defaultIndex: 'logstash-*',
  };

  describe('discover filter editor', function describeIndexTests() {
    before(async function () {
      log.debug('load kibana index with default index pattern');
      await esArchiver.loadIfNeeded('discover');

      // and load a set of makelogs data
      await esArchiver.loadIfNeeded('logstash_functional');
      await kibanaServer.uiSettings.replace(defaultSettings);
      log.debug('discover filter editor');
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setDefaultAbsoluteRange();
    });

    describe('filter editor', function () {
      it('should add a phrases filter', async function () {
        await filterBar.addFilter('extension.raw', 'is one of', 'jpg');
        expect(await filterBar.hasFilter('extension.raw', 'jpg')).to.be(true);
      });

      it('should show the phrases if you re-open a phrases filter', async function () {
        await filterBar.clickEditFilter('extension.raw', 'jpg');
        const phrases = await filterBar.getFilterEditorSelectedPhrases();
        expect(phrases.length).to.be(1);
        expect(phrases[0]).to.be('jpg');
        await filterBar.ensureFieldEditorModalIsClosed();
      });

      it('should support filtering on nested fields', async () => {
        await filterBar.addFilter('nestedField.child', 'is', 'nestedValue');
        expect(await filterBar.hasFilter('nestedField.child', 'nestedValue')).to.be(true);
        await retry.try(async function () {
          expect(await PageObjects.discover.getHitCount()).to.be('1');
        });
      });
    });
  });
}
