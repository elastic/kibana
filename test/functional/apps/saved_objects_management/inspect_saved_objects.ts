/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'settings', 'savedObjects']);
  const find = getService('find');

  const focusAndClickButton = async (buttonSubject: string) => {
    const button = await testSubjects.find(buttonSubject);
    await button.scrollIntoViewIfNecessary();
    await delay(100);
    await button.focus();
    await delay(100);
    await button.click();
    // Allow some time for the transition/animations to occur before assuming the click is done
    await delay(100);
  };

  const textIncludesAll = (text: string, items: string[]) => {
    const bools = items.map((item) => !!text.includes(item));
    return bools.every((currBool) => currBool === true);
  };

  // FLAKY: https://github.com/elastic/kibana/issues/118288
  describe.skip('saved objects inspect page', () => {
    beforeEach(async () => {
      await esArchiver.load(
        'test/functional/fixtures/es_archiver/saved_objects_management/edit_saved_object'
      );
    });

    afterEach(async () => {
      await esArchiver.unload(
        'test/functional/fixtures/es_archiver/saved_objects_management/edit_saved_object'
      );
    });

    it('allows to view the saved object', async () => {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaSavedObjects();
      const objects = await PageObjects.savedObjects.getRowTitles();
      expect(objects.includes('A Dashboard')).to.be(true);
      await PageObjects.common.navigateToUrl('management', 'kibana/objects/dashboard/i-exist', {
        shouldUseHashForSubUrl: false,
      });
      const inspectContainer = await find.byClassName('kibanaCodeEditor');
      const visibleContainerText = await inspectContainer.getVisibleText();
      // ensure that something renders visibly
      expect(
        textIncludesAll(visibleContainerText, [
          'A Dashboard',
          'title',
          'id',
          'type',
          'attributes',
          'references',
        ])
      ).to.be(true);
    });

    it('allows to delete a saved object', async () => {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaSavedObjects();
      let objects = await PageObjects.savedObjects.getRowTitles();
      expect(objects.includes('A Dashboard')).to.be(true);

      await PageObjects.savedObjects.clickInspectByTitle('A Dashboard');
      await PageObjects.common.navigateToUrl('management', 'kibana/objects/dashboard/i-exist', {
        shouldUseHashForSubUrl: false,
      }); // we should wait for it to load.
      // wait for the Inspect view to load
      await PageObjects.savedObjects.waitInspectObjectIsLoaded();
      await focusAndClickButton('savedObjectEditDelete');
      await PageObjects.common.clickConfirmOnModal();
      objects = await PageObjects.savedObjects.getRowTitles();
      expect(objects.includes('A Dashboard')).to.be(false);
    });
  });
}
