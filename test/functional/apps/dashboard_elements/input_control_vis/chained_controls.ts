/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const filterBar = getService('filterBar');
  const { common, visualize, visEditor } = getPageObjects(['common', 'visualize', 'visEditor']);
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const comboBox = getService('comboBox');

  describe('chained controls', function () {
    this.tags('includeFirefox');

    before(async () => {
      await visualize.initTests();
      await common.navigateToApp('visualize');
      await visualize.loadSavedVisualization('chained input control', {
        navigateToVisualize: false,
      });
      await testSubjects.waitForEnabled('addFilter', 10000);
    });

    it('should disable child control when parent control is not set', async () => {
      const parentControlMenu = await comboBox.getOptionsList('listControlSelect0');
      expect(parentControlMenu.trim().split('\n').join()).to.equal('BD,BR,CN,ID,IN,JP,NG,PK,RU');

      const childControlInput = await find.byCssSelector('[data-test-subj="inputControl1"] input');
      const isDisabled = await childControlInput.getAttribute('disabled');
      expect(isDisabled).to.equal('true');
    });

    it('should filter child control options by parent control value', async () => {
      await comboBox.set('listControlSelect0', 'BR');
      const childControlMenu = await comboBox.getOptionsList('listControlSelect1');
      expect(childControlMenu.trim().split('\n').join()).to.equal(
        '14.61.182.136,3.174.21.181,6.183.121.70,71.241.97.89,9.69.255.135'
      );
    });

    it('should create a seperate filter pill for parent control and child control', async () => {
      await comboBox.set('listControlSelect1', '14.61.182.136');

      await visEditor.inputControlSubmit();

      const hasParentControlFilter = await filterBar.hasFilter('geo.src', 'BR');
      expect(hasParentControlFilter).to.equal(true);

      const hasChildControlFilter = await filterBar.hasFilter('clientip', '14.61.182.136');
      expect(hasChildControlFilter).to.equal(true);
    });

    it('should clear child control dropdown when parent control value is removed', async () => {
      await comboBox.clear('listControlSelect0');
      await common.sleep(500); // give time for filter to be removed and event handlers to fire

      const childControlInput = await find.byCssSelector('[data-test-subj="inputControl1"] input');
      const isDisabled = await childControlInput.getAttribute('disabled');
      expect(isDisabled).to.equal('true');

      await testSubjects.click('inputControlCancelBtn');
    });

    it('should clear child control dropdown when parent control filter pill removed', async () => {
      await filterBar.removeFilter('geo.src');
      await common.sleep(500); // give time for filter to be removed and event handlers to fire

      const hasValue = await comboBox.doesComboBoxHaveSelectedOptions('listControlSelect0');
      expect(hasValue).to.equal(false);
    });
  });
}
