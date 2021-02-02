/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'settings', 'savedObjects']);
  const browser = getService('browser');
  const find = getService('find');

  const setFieldValue = async (fieldName: string, value: string) => {
    return testSubjects.setValue(`savedObjects-editField-${fieldName}`, value);
  };

  const getFieldValue = async (fieldName: string) => {
    return testSubjects.getAttribute(`savedObjects-editField-${fieldName}`, 'value');
  };

  const setAceEditorFieldValue = async (fieldName: string, fieldValue: string) => {
    const editorId = `savedObjects-editField-${fieldName}-aceEditor`;
    await find.clickByCssSelector(`#${editorId}`);
    return browser.execute(
      (editor: string, value: string) => {
        return (window as any).ace.edit(editor).setValue(value);
      },
      editorId,
      fieldValue
    );
  };

  const getAceEditorFieldValue = async (fieldName: string) => {
    const editorId = `savedObjects-editField-${fieldName}-aceEditor`;
    await find.clickByCssSelector(`#${editorId}`);
    return browser.execute((editor: string) => {
      return (window as any).ace.edit(editor).getValue() as string;
    }, editorId);
  };

  const focusAndClickButton = async (buttonSubject: string) => {
    const button = await testSubjects.find(buttonSubject);
    await button.scrollIntoViewIfNecessary();
    await delay(10);
    await button.focus();
    await delay(10);
    await button.click();
  };

  // Flaky: https://github.com/elastic/kibana/issues/68400
  describe.skip('saved objects edition page', () => {
    beforeEach(async () => {
      await esArchiver.load('saved_objects_management/edit_saved_object');
    });

    afterEach(async () => {
      await esArchiver.unload('saved_objects_management/edit_saved_object');
    });

    it('allows to update the saved object when submitting', async () => {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaSavedObjects();

      let objects = await PageObjects.savedObjects.getRowTitles();
      expect(objects.includes('A Dashboard')).to.be(true);

      await PageObjects.common.navigateToUrl(
        'management',
        'kibana/objects/savedDashboards/i-exist',
        {
          shouldUseHashForSubUrl: false,
        }
      );

      await testSubjects.existOrFail('savedObjectEditSave');

      expect(await getFieldValue('title')).to.eql('A Dashboard');

      await setFieldValue('title', 'Edited Dashboard');
      await setFieldValue('description', 'Some description');

      await focusAndClickButton('savedObjectEditSave');

      objects = await PageObjects.savedObjects.getRowTitles();
      expect(objects.includes('A Dashboard')).to.be(false);
      expect(objects.includes('Edited Dashboard')).to.be(true);

      await PageObjects.common.navigateToUrl(
        'management',
        'kibana/objects/savedDashboards/i-exist',
        {
          shouldUseHashForSubUrl: false,
        }
      );

      expect(await getFieldValue('title')).to.eql('Edited Dashboard');
      expect(await getFieldValue('description')).to.eql('Some description');
    });

    it('allows to delete a saved object', async () => {
      await PageObjects.common.navigateToUrl(
        'management',
        'kibana/objects/savedDashboards/i-exist',
        {
          shouldUseHashForSubUrl: false,
        }
      );

      await focusAndClickButton('savedObjectEditDelete');
      await PageObjects.common.clickConfirmOnModal();

      const objects = await PageObjects.savedObjects.getRowTitles();
      expect(objects.includes('A Dashboard')).to.be(false);
    });

    it('preserves the object references when saving', async () => {
      const testVisualizationUrl =
        'kibana/objects/savedVisualizations/75c3e060-1e7c-11e9-8488-65449e65d0ed';
      const visualizationRefs = [
        {
          name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
          type: 'index-pattern',
          id: 'logstash-*',
        },
      ];

      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaSavedObjects();

      const objects = await PageObjects.savedObjects.getRowTitles();
      expect(objects.includes('A Pie')).to.be(true);

      await PageObjects.common.navigateToUrl('management', testVisualizationUrl, {
        shouldUseHashForSubUrl: false,
      });

      await testSubjects.existOrFail('savedObjectEditSave');

      let displayedReferencesValue = await getAceEditorFieldValue('references');

      expect(JSON.parse(displayedReferencesValue)).to.eql(visualizationRefs);

      await focusAndClickButton('savedObjectEditSave');

      await PageObjects.savedObjects.getRowTitles();

      await PageObjects.common.navigateToUrl('management', testVisualizationUrl, {
        shouldUseHashForSubUrl: false,
      });

      // Parsing to avoid random keys ordering issues in raw string comparison
      expect(JSON.parse(await getAceEditorFieldValue('references'))).to.eql(visualizationRefs);

      await setAceEditorFieldValue('references', JSON.stringify([], undefined, 2));

      await focusAndClickButton('savedObjectEditSave');

      await PageObjects.savedObjects.getRowTitles();

      await PageObjects.common.navigateToUrl('management', testVisualizationUrl, {
        shouldUseHashForSubUrl: false,
      });

      displayedReferencesValue = await getAceEditorFieldValue('references');

      expect(JSON.parse(displayedReferencesValue)).to.eql([]);
    });
  });
}
