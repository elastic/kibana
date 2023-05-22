/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'dashboard', 'visualize', 'visEditor', 'header', 'timePicker']);
  const comboBox = getService('comboBox');

  describe('dynamic options', () => {
    before(async () => {
      await PageObjects.visualize.initTests();
    });

    describe('without chained controls', () => {
      beforeEach(async () => {
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.loadSavedDashboard('legacy input control dynamic options');
        await PageObjects.dashboard.waitForRenderComplete();
      });

      it('should fetch new options when string field is filtered', async () => {
        const initialOptions = await comboBox.getOptionsList('listControlSelect0');
        expect(initialOptions.trim().split('\n').join()).to.equal('BD,BR,CN,ID,IN,JP,NG,PK,RU');

        await comboBox.filterOptionsList('listControlSelect0', 'R');
        await PageObjects.header.waitUntilLoadingHasFinished();

        const updatedOptions = await comboBox.getOptionsList('listControlSelect0');
        expect(updatedOptions.trim().split('\n').join()).to.equal('AR,BR,FR,GR,IR,KR,RO,RU,RW');
      });
    });

    describe('with chained controls', () => {
      before(async () => {
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.loadSavedDashboard('legacy input controls chained input control with dynamic options');
        await PageObjects.dashboard.waitForRenderComplete();
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
