/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PluginFunctionalProviderContext } from '../../services';

export default function ({ getService, getPageObject }: PluginFunctionalProviderContext) {
  const common = getPageObject('common');
  const browser = getService('browser');
  const appsMenu = getService('appsMenu');
  const testSubjects = getService('testSubjects');

  describe('application using leave confirmation', () => {
    describe('when navigating to another app', () => {
      it('prevents navigation if user click cancel on the confirmation dialog', async () => {
        await common.navigateToApp('appleave1');
        await browser.waitForUrlToBe('/app/appleave1');

        await appsMenu.clickLink('AppLeave 2', { category: 'kibana' });
        await testSubjects.existOrFail('appLeaveConfirmModal');
        await common.clickCancelOnModal(false);
        await browser.waitForUrlToBe('/app/appleave1');
      });

      it('allows navigation if user click confirm on the confirmation dialog', async () => {
        await common.navigateToApp('appleave1');
        await browser.waitForUrlToBe('/app/appleave1');

        await appsMenu.clickLink('AppLeave 2', { category: 'kibana' });
        await testSubjects.existOrFail('appLeaveConfirmModal');
        await common.clickConfirmOnModal();
        await browser.waitForUrlToBe('/app/appleave2');
      });
    });
  });
}
