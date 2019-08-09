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
  const PageObjects = getPageObjects(['common', 'visualize', 'header', 'timePicker']);
  const comboBox = getService('comboBox');

  describe('dynamic options', () => {

    describe('without chained controls', () => {
      beforeEach(async () => {
        await PageObjects.common.navigateToApp('visualize');
        await PageObjects.visualize.loadSavedVisualization('dynamic options input control', { navigateToVisualize: false });
      });

      it('should fetch new options when string field is filtered', async () => {
        const initialOptions = await comboBox.getOptionsList('listControlSelect0');
        expect(initialOptions.trim().split('\n').join()).to.equal('BD,BR,CN,ID,IN,JP,NG,PK,RU,US');

        await comboBox.filterOptionsList('listControlSelect0', 'R');
        await PageObjects.header.waitUntilLoadingHasFinished();

        const updatedOptions = await comboBox.getOptionsList('listControlSelect0');
        expect(updatedOptions.trim().split('\n').join()).to.equal('AR,BR,FR,GR,IR,KR,RO,RU,RW,TR');
      });

      it('should not fetch new options when non-string is filtered', async () => {
        await comboBox.set('fieldSelect-0', 'clientip');
        await PageObjects.visualize.clickGo();

        const initialOptions = await comboBox.getOptionsList('listControlSelect0');
        expect(initialOptions.trim().split('\n').join()).to.equal(
          '135.206.117.161,177.194.175.66,18.55.141.62,243.158.217.196,32.146.206.24');

        await comboBox.filterOptionsList('listControlSelect0', '17');
        await PageObjects.header.waitUntilLoadingHasFinished();

        const updatedOptions = await comboBox.getOptionsList('listControlSelect0');
        expect(updatedOptions.trim().split('\n').join()).to.equal('135.206.117.161,177.194.175.66,243.158.217.196');
      });
    });

    describe('with chained controls', () => {
      before(async () => {
        await PageObjects.common.navigateToApp('visualize');
        await PageObjects.visualize.loadSavedVisualization('chained input control with dynamic options', { navigateToVisualize: false });
        await comboBox.set('listControlSelect0', 'win 7');
      });

      it('should fetch new options when string field is filtered', async () => {
        const initialOptions = await comboBox.getOptionsList('listControlSelect1');
        expect(initialOptions.trim().split('\n').join()).to.equal('BD,BR,CN,ID,IN,JP,MX,NG,PK,US');

        await comboBox.filterOptionsList('listControlSelect1', 'R');
        await PageObjects.header.waitUntilLoadingHasFinished();

        const updatedOptions = await comboBox.getOptionsList('listControlSelect1');
        expect(updatedOptions.trim().split('\n').join()).to.equal('AR,BR,FR,GR,IR,KR,RO,RS,RU,TR');
      });
    });
  });
}
