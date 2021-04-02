/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from './ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const fieldEditor = getService('fieldEditor');
  const PageObjects = getPageObjects(['common', 'discover', 'header', 'timePicker']);
  const defaultSettings = {
    defaultIndex: 'logstash-*',
    'discover:searchFieldsFromSource': false,
  };
  describe('discover integration with runtime fields editor', function describeIndexTests() {
    before(async function () {
      await esArchiver.load('discover');
      await esArchiver.loadIfNeeded('logstash_functional');
      await kibanaServer.uiSettings.replace(defaultSettings);
      log.debug('discover');
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setDefaultAbsoluteRange();
    });

    after(async () => {
      await kibanaServer.uiSettings.replace({ 'discover:searchFieldsFromSource': true });
    });

    it('allows adding custom label to existing fields', async function () {
      await PageObjects.discover.clickFieldListItemAdd('bytes');
      await PageObjects.discover.editField('bytes');
      await fieldEditor.enableCustomLabel();
      await fieldEditor.setCustomLabel('megabytes');
      await fieldEditor.save();
      await PageObjects.header.waitUntilLoadingHasFinished();
      expect(await PageObjects.discover.getDocHeader()).to.have.string('megabytes');
      expect((await PageObjects.discover.getAllFieldNames()).includes('megabytes')).to.be(true);
    });

    it('allows creation of a new field', async function () {
      await PageObjects.discover.clickIndexPatternActions();
      await PageObjects.discover.clickAddNewField();
      await fieldEditor.setName('runtimefield');
      await fieldEditor.enableValue();
      await fieldEditor.typeScript("emit('abc')");
      await fieldEditor.save();
      await PageObjects.header.waitUntilLoadingHasFinished();
      expect((await PageObjects.discover.getAllFieldNames()).includes('runtimefield')).to.be(true);
    });

    it('allows editing of a newly created field', async function () {
      await PageObjects.discover.editField('runtimefield');
      await fieldEditor.setName('runtimefield edited');
      await fieldEditor.save();
      await fieldEditor.confirmSave();
      await PageObjects.header.waitUntilLoadingHasFinished();
      expect((await PageObjects.discover.getAllFieldNames()).includes('runtimefield')).to.be(false);
      expect((await PageObjects.discover.getAllFieldNames()).includes('runtimefield edited')).to.be(
        true
      );
    });
  });
}
