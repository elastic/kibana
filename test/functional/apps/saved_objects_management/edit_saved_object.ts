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
import { FtrProviderContext } from '../../ftr_provider_context';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'settings']);

  const setFieldValue = async (fieldName: string, value: string) => {
    return testSubjects.setValue(`savedObjects-editField-${fieldName}`, value);
  };

  const getFieldValue = async (fieldName: string) => {
    return testSubjects.getAttribute(`savedObjects-editField-${fieldName}`, 'value');
  };

  const focusAndClickButton = async (buttonSubject: string) => {
    const button = await testSubjects.find(buttonSubject);
    await button.scrollIntoViewIfNecessary();
    await delay(10);
    await button.focus();
    await delay(10);
    await button.click();
  };

  describe('saved objects edition page', () => {
    beforeEach(async () => {
      await esArchiver.load('saved_objects_management/edit_saved_object');
    });

    afterEach(async () => {
      await esArchiver.unload('saved_objects_management/edit_saved_object');
    });

    it('allows to update the saved object when submitting', async () => {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaSavedObjects();

      let objects = await PageObjects.settings.getSavedObjectsInTable();
      expect(objects.includes('A Dashboard')).to.be(true);

      await PageObjects.common.navigateToActualUrl(
        'kibana',
        '/management/kibana/objects/savedDashboards/i-exist'
      );

      await testSubjects.existOrFail('savedObjectEditSave');

      expect(await getFieldValue('title')).to.eql('A Dashboard');

      await setFieldValue('title', 'Edited Dashboard');
      await setFieldValue('description', 'Some description');

      await focusAndClickButton('savedObjectEditSave');

      objects = await PageObjects.settings.getSavedObjectsInTable();
      expect(objects.includes('A Dashboard')).to.be(false);
      expect(objects.includes('Edited Dashboard')).to.be(true);

      await PageObjects.common.navigateToActualUrl(
        'kibana',
        '/management/kibana/objects/savedDashboards/i-exist'
      );

      expect(await getFieldValue('title')).to.eql('Edited Dashboard');
      expect(await getFieldValue('description')).to.eql('Some description');
    });

    it('allows to delete a saved object', async () => {
      await PageObjects.common.navigateToActualUrl(
        'kibana',
        '/management/kibana/objects/savedDashboards/i-exist'
      );

      await focusAndClickButton('savedObjectEditDelete');
      await PageObjects.common.clickConfirmOnModal();

      const objects = await PageObjects.settings.getSavedObjectsInTable();
      expect(objects.includes('A Dashboard')).to.be(false);
    });
  });
}
