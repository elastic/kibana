/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import url from 'url';
import expect from '@kbn/expect';
import { PluginFunctionalProviderContext } from '../../services';

const getKibanaUrl = (pathname?: string, search?: string) =>
  url.format({
    protocol: 'http:',
    hostname: process.env.TEST_KIBANA_HOST || 'localhost',
    port: process.env.TEST_KIBANA_PORT || '5620',
    pathname,
    search,
  });

export default function ({ getService, getPageObjects }: PluginFunctionalProviderContext) {
  const PageObjects = getPageObjects(['common']);
  const browser = getService('browser');
  const appsMenu = getService('appsMenu');
  const testSubjects = getService('testSubjects');

  describe('application using leave confirmation', () => {
    describe('when navigating to another app', () => {
      it('prevents navigation if user click cancel on the confirmation dialog', async () => {
        await PageObjects.common.navigateToApp('appleave1');
        await appsMenu.clickLink('AppLeave 2');

        await testSubjects.existOrFail('appLeaveConfirmModal');
        await PageObjects.common.clickCancelOnModal(false);
        expect(await browser.getCurrentUrl()).to.eql(getKibanaUrl('/app/appleave1'));
      });
      it('allows navigation if user click confirm on the confirmation dialog', async () => {
        await PageObjects.common.navigateToApp('appleave1');
        await appsMenu.clickLink('AppLeave 2');

        await testSubjects.existOrFail('appLeaveConfirmModal');
        await PageObjects.common.clickConfirmOnModal();
        expect(await browser.getCurrentUrl()).to.eql(getKibanaUrl('/app/appleave2'));
      });
    });
  });
}
