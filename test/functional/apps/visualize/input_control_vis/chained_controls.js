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

export default function ({ getService, getPageObjects }) {
  const filterBar = getService('filterBar');
  const PageObjects = getPageObjects(['common', 'visualize', 'header', 'timePicker']);
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const comboBox = getService('comboBox');

  describe('chained controls', () => {

    before(async () => {
      await PageObjects.common.navigateToApp('visualize');
      await PageObjects.visualize.loadSavedVisualization('chained input control', { navigateToVisualize: false });
    });

    it('should disable child control when parent control is not set', async () => {
      const parentControlMenu = await comboBox.getOptionsList('listControlSelect0');
      expect(parentControlMenu.trim().split('\n').join()).to.equal('BD,BR,CN,ID,IN,JP,NG,PK,RU,US');

      const childControlInput = await find.byCssSelector('[data-test-subj="inputControl1"] input');
      const isDisabled = await childControlInput.getProperty('disabled');
      expect(isDisabled).to.equal(true);
    });

    it('should filter child control options by parent control value', async () => {
      await comboBox.set('listControlSelect0', 'BR');

      const childControlMenu = await comboBox.getOptionsList('listControlSelect1');
      expect(childControlMenu.trim().split('\n').join()).to.equal('14.61.182.136,3.174.21.181,6.183.121.70,71.241.97.89,9.69.255.135');
    });

    it('should create a seperate filter pill for parent control and child control', async () => {
      await comboBox.set('listControlSelect1', '14.61.182.136');

      await PageObjects.visualize.inputControlSubmit();

      const hasParentControlFilter = await filterBar.hasFilter('geo.src', 'BR');
      expect(hasParentControlFilter).to.equal(true);

      const hasChildControlFilter = await filterBar.hasFilter('clientip', '14.61.182.136');
      expect(hasChildControlFilter).to.equal(true);
    });

    it('should clear child control dropdown when parent control value is removed', async () => {
      await comboBox.clear('listControlSelect0');
      await PageObjects.common.sleep(500); // give time for filter to be removed and event handlers to fire

      const childControlInput = await find.byCssSelector('[data-test-subj="inputControl1"] input');
      const isDisabled = await childControlInput.getProperty('disabled');
      expect(isDisabled).to.equal(true);

      await testSubjects.click('inputControlCancelBtn');
    });

    it('should clear child control dropdown when parent control filter pill removed', async () => {
      await filterBar.removeFilter('geo.src');
      await PageObjects.common.sleep(500); // give time for filter to be removed and event handlers to fire

      const hasValue = await comboBox.doesComboBoxHaveSelectedOptions('listControlSelect0');
      expect(hasValue).to.equal(false);
    });
  });
}
