/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { PluginFunctionalProviderContext } from '../../plugin_functional/services';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: PluginFunctionalProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');

  describe('', () => {
    it('finds a data view', async () => {
      await testSubjects.existOrFail('dataViewTitle');
    });

    it('opens the field editor', async () => {
      await testSubjects.click('addField');
      await testSubjects.existOrFail('flyoutTitle');
      await testSubjects.click('closeFlyoutButton');
    });

    it('uses preconfigured options for a new field', async () => {
      // find the checkbox label and click it - `testSubjects.setCheckbox()` is not working for our checkbox
      const controlWrapper = await testSubjects.find('preconfiguredControlWrapper');
      const control = await find.descendantDisplayedByCssSelector('label', controlWrapper);
      await control.click();

      await testSubjects.click('addField');
      await testSubjects.existOrFail('flyoutTitle');

      const nameField = await testSubjects.find('nameField');
      const nameInput = await find.descendantDisplayedByCssSelector(
        '[data-test-subj=input]',
        nameField
      );

      expect(await nameInput.getAttribute('value')).to.equal('demotestfield');
    });
  });
}
