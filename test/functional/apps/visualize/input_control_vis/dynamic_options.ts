/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'visualize', 'visEditor', 'header', 'timePicker']);
  const comboBox = getService('comboBox');

  describe('dynamic options', () => {
    describe('without chained controls', () => {
      beforeEach(async () => {
        await PageObjects.common.navigateToApp('visualize');
        await PageObjects.visualize.loadSavedVisualization('dynamic options input control', {
          navigateToVisualize: false,
        });
      });

      it('should fetch new options when string field is filtered', async () => {
        const initialOptions = await comboBox.getOptionsList('listControlSelect0');
        expect(initialOptions.trim().split('\n').join()).to.equal('BD,BR,CN,ID,IN,JP,NG,PK,RU');

        await comboBox.filterOptionsList('listControlSelect0', 'R');
        await PageObjects.header.waitUntilLoadingHasFinished();

        const updatedOptions = await comboBox.getOptionsList('listControlSelect0');
        expect(updatedOptions.trim().split('\n').join()).to.equal('AR,BR,FR,GR,IR,KR,RO,RU,RW');
      });

      it('should not fetch new options when non-string is filtered', async () => {
        await comboBox.set('fieldSelect-0', 'clientip');
        await PageObjects.visEditor.clickGo();

        const initialOptions = await comboBox.getOptionsList('listControlSelect0');
        expect(initialOptions.trim().split('\n').join()).to.equal(
          '135.206.117.161,177.194.175.66,18.55.141.62,243.158.217.196,32.146.206.24'
        );

        await comboBox.filterOptionsList('listControlSelect0', '17');
        await PageObjects.header.waitUntilLoadingHasFinished();

        const updatedOptions = await comboBox.getOptionsList('listControlSelect0');
        expect(updatedOptions.trim().split('\n').join()).to.equal(
          '135.206.117.161,177.194.175.66,243.158.217.196'
        );
      });
    });

    describe('with chained controls', () => {
      before(async () => {
        await PageObjects.common.navigateToApp('visualize');
        await PageObjects.visualize.loadSavedVisualization(
          'chained input control with dynamic options',
          { navigateToVisualize: false }
        );
        await comboBox.set('listControlSelect0', 'win 7');
      });

      it('should fetch new options when string field is filtered', async () => {
        const initialOptions = await comboBox.getOptionsList('listControlSelect1');
        expect(initialOptions.trim().split('\n').join()).to.equal('BD,BR,CN,ID,IN,JP,MX,NG,PK');

        await comboBox.filterOptionsList('listControlSelect1', 'R');
        await PageObjects.header.waitUntilLoadingHasFinished();

        const updatedOptions = await comboBox.getOptionsList('listControlSelect1');
        expect(updatedOptions.trim().split('\n').join()).to.equal('AR,BR,FR,GR,IR,KR,RO,RS,RU');
      });
    });
  });
}
