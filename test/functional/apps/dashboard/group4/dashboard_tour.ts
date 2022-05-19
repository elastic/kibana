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
  const browser = getService('browser');
  const find = getService('find');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'dashboard']);

  const tourHeaderExists = async () => {
    return await find.exists(async () => {
      return await find.byXPath('//div[@class="euiPopoverTitle euiTourHeader"]');
    });
  };

  describe('dashboard tour', function () {
    before(async () => {
      await PageObjects.dashboard.initTests();
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.saveDashboard('Test Dashboard Tour');
    });

    describe('in view mode', async () => {
      before(async () => {
        await browser.removeLocalStorageItem('dashboard.view.tourState');
        await browser.refresh();
      });

      it('tour starts', async () => {
        await PageObjects.dashboard.clickCancelOutOfEditMode();
        expect(await tourHeaderExists()).to.be(true);
      });

      it('can manually skip tour', async () => {
        const endTourButton = await find.byButtonText('Close tour');
        await endTourButton.click();
        retry.try(async () => {
          expect(await tourHeaderExists()).to.be(false);
        });
      });

      it('can skip tour by clicking edit button', async () => {
        await browser.removeLocalStorageItem('dashboard.view.tourState');
        await browser.refresh();
        expect(await tourHeaderExists()).to.be(true);

        await PageObjects.dashboard.switchToEditMode();
        expect(await tourHeaderExists()).to.be(false);
        await PageObjects.dashboard.clickCancelOutOfEditMode();
        expect(await tourHeaderExists()).to.be(false);
      });
    });

    describe('in edit mode', async () => {
      before(async () => {
        await browser.removeLocalStorageItem('dashboard.edit.tourState');
        await browser.refresh();
      });

      it('tour starts', async () => {
        await PageObjects.dashboard.switchToEditMode();
        expect(await tourHeaderExists()).to.be(true);
      });

      it('can manually skip tour', async () => {
        const endTourButton = await find.byButtonText('Skip tour');
        await endTourButton.click();
        retry.try(async () => {
          expect(await tourHeaderExists()).to.be(false);
        });
      });
    });
  });
}
