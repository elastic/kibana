/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../functional/ftr_provider_context';

const TEST_START_TIME = 'Sep 19, 2015 @ 06:31:44.000';
const TEST_END_TIME = 'Sep 23, 2015 @ 18:31:44.000';

// eslint-disable-next-line import/no-default-export
export default ({ getService, getPageObjects }: FtrProviderContext) => {
  const PageObjects = getPageObjects(['common', 'timePicker', 'header']);
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const defaultSettings = { defaultIndex: 'logstash-*' };

  describe('Customizations', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.uiSettings.replace(defaultSettings);
      await PageObjects.common.navigateToApp('home');
      const currentUrl = await browser.getCurrentUrl();
      const customizationUrl =
        currentUrl.substring(0, currentUrl.indexOf('/app/home')) +
        '/app/discoverCustomizationExamples';
      await browser.get(customizationUrl);
      await PageObjects.timePicker.setAbsoluteRange(TEST_START_TIME, TEST_END_TIME);
      await PageObjects.header.waitUntilLoadingHasFinished();
    });

    after(async () => {
      await kibanaServer.uiSettings.unset('defaultIndex');
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('Top nav', async () => {
      await testSubjects.existOrFail('customOptionsButton');
      await testSubjects.existOrFail('shareTopNavButton');
      await testSubjects.existOrFail('documentExplorerButton');
      await testSubjects.missingOrFail('discoverNewButton');
      await testSubjects.missingOrFail('discoverOpenButton');
      await testSubjects.click('customOptionsButton');
      await testSubjects.existOrFail('customOptionsPopover');
      await testSubjects.click('customOptionsButton');
      await testSubjects.missingOrFail('customOptionsPopover');
    });

    it('Search bar', async () => {
      await testSubjects.click('logsViewSelectorButton');
      await testSubjects.click('logsViewSelectorOption-ASavedSearch');
      await PageObjects.header.waitUntilLoadingHasFinished();
      const { title, description } = await PageObjects.common.getSharedItemTitleAndDescription();
      const expected = {
        title: 'A Saved Search',
        description: 'A Saved Search Description',
      };
      expect(title).to.eql(expected.title);
      expect(description).to.eql(expected.description);
    });

    it('Search bar Prepend Filters', async () => {
      await testSubjects.existOrFail('customPrependedFilter');
      await testSubjects.click('customPrependedFilter');
      await testSubjects.existOrFail('optionsList-control-selection-exists');

      const optionListItem = await testSubjects.find('optionsList-control-selection-exists');
      const visibleText = await optionListItem.getVisibleText();

      expect(visibleText).to.eql('Exists');
    });
  });
};
