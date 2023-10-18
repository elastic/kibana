/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import url from 'url';
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
  const PageObjects = getPageObjects(['common', 'header']);
  const browser = getService('browser');
  const appsMenu = getService('appsMenu');
  const log = getService('log');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const config = getService('config');

  const waitForUrlToBe = async (pathname?: string, search?: string) => {
    const expectedUrl = getKibanaUrl(pathname, search);
    return await retry.waitFor(`Url to be ${expectedUrl}`, async () => {
      const currentUrl = await browser.getCurrentUrl();
      log.debug(`waiting for currentUrl ${currentUrl} to be expectedUrl ${expectedUrl}`);
      return currentUrl === expectedUrl;
    });
  };

  const ensureModalOpen = async (
    defaultTryTimeout: number,
    attempts: number,
    timeMultiplier: number,
    action: 'cancel' | 'confirm'
  ): Promise<void> => {
    let isConfirmCancelModalOpenState = false;
    await retry.tryForTime(defaultTryTimeout * timeMultiplier, async () => {
      isConfirmCancelModalOpenState = await testSubjects.exists('confirmModalTitleText', {
        allowHidden: true,
        timeout: defaultTryTimeout * timeMultiplier,
      });
    });
    if (isConfirmCancelModalOpenState) {
      log.debug(`defaultTryTimeout * ${timeMultiplier} is long enough`);
      return action === 'cancel'
        ? await PageObjects.common.clickCancelOnModal(true, false)
        : await PageObjects.common.clickConfirmOnModal();
    } else {
      log.debug(`defaultTryTimeout * ${timeMultiplier} is not long enough`);
      return await ensureModalOpen(
        defaultTryTimeout,
        (attempts = attempts > 0 ? attempts - 1 : 0),
        (timeMultiplier = timeMultiplier < 10 ? timeMultiplier + 1 : 10),
        action
      );
    }
  };

  describe('application using leave confirmation', () => {
    const defaultTryTimeout = config.get('timeouts.try');
    const attempts = 5;
    describe('when navigating to another app', () => {
      const timeMultiplier = 10;
      debugger;
      it('prevents navigation if user click cancel on the confirmation dialog', async () => {
        await PageObjects.common.navigateToApp('appleave1');
        debugger;
        await PageObjects.header.waitUntilLoadingHasFinished();
        await waitForUrlToBe('/app/appleave1');
        debugger;
        await appsMenu.clickLink('AppLeave 2');
        debugger;
        await ensureModalOpen(defaultTryTimeout, attempts, timeMultiplier, 'cancel');
        await PageObjects.header.waitUntilLoadingHasFinished();
        debugger;
        await retry.waitFor('navigate to appleave1', async () => {
          const currentUrl = await browser.getCurrentUrl();
          debugger;
          log.debug(`currentUrl ${currentUrl}`);
          return currentUrl.includes('appleave1');
        });
        const currentUrl = await browser.getCurrentUrl();
        debugger;
        expect(currentUrl).to.contain('appleave1');
        debugger;
        await PageObjects.common.navigateToApp('home');
      });

      it('allows navigation if user click confirm on the confirmation dialog', async () => {
        await PageObjects.common.navigateToApp('appleave1');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await waitForUrlToBe('/app/appleave1');

        await appsMenu.clickLink('AppLeave 2');
        await ensureModalOpen(defaultTryTimeout, attempts, timeMultiplier, 'confirm');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await retry.waitFor('navigate to appleave1', async () => {
          const currentUrl = await browser.getCurrentUrl();
          log.debug(`currentUrl ${currentUrl}`);
          return currentUrl.includes('appleave2');
        });
        const currentUrl = await browser.getCurrentUrl();
        expect(currentUrl).to.contain('appleave2');
        await PageObjects.common.navigateToApp('home');
      });
    });
  });
}
