/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Url from 'url';
import expect from '@kbn/expect';
import {
  AppNavLinkStatus,
  AppStatus,
  AppUpdatableFields,
} from '@kbn/core/public/application/types';
import { PluginFunctionalProviderContext } from '../../services';
import '@kbn/core-app-status-plugin/public/types';

const getKibanaUrl = (pathname?: string, search?: string) =>
  Url.format({
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
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');

  const setAppStatus = async (s: Partial<AppUpdatableFields>) => {
    return browser.executeAsync(async (status, cb) => {
      window._coreAppStatus.setAppStatus(status);
      cb();
    }, s);
  };

  const navigateToApp = async (id: string) => {
    return await browser.executeAsync(async (appId, cb) => {
      await window._coreAppStatus.navigateToApp(appId);
      cb();
    }, id);
  };

  describe('application status management', () => {
    beforeEach(async () => {
      await PageObjects.common.navigateToApp('app_status_start');
    });

    it('can change the navLink status at runtime', async () => {
      await setAppStatus({
        navLinkStatus: AppNavLinkStatus.disabled,
      });
      let link = await appsMenu.getLink('App Status');
      expect(link).not.to.eql(undefined);
      expect(link!.disabled).to.eql(true);

      await setAppStatus({
        navLinkStatus: AppNavLinkStatus.hidden,
      });
      link = await appsMenu.getLink('App Status');
      expect(link).to.eql(undefined);
    });

    it('shows an error when navigating to an inaccessible app', async () => {
      await setAppStatus({
        status: AppStatus.inaccessible,
      });

      await navigateToApp('app_status');

      expect(await testSubjects.exists('appNotFoundPageContent')).to.eql(true);
      expect(await testSubjects.exists('appStatusApp')).to.eql(false);
    });

    it('allows to navigate to an accessible app', async () => {
      await setAppStatus({
        status: AppStatus.accessible,
      });

      await navigateToApp('app_status');

      expect(await testSubjects.exists('appNotFoundPageContent')).to.eql(false);
      expect(await testSubjects.exists('appStatusApp')).to.eql(true);
    });

    it('allows to change the defaultPath of an application', async () => {
      const link = await appsMenu.getLink('App Status');
      expect(link!.href).to.eql(getKibanaUrl('/app/app_status'));

      await setAppStatus({
        defaultPath: '/arbitrary/path',
      });

      await retry.waitFor('link url updated with "defaultPath"', async () => {
        const updatedLink = await appsMenu.getLink('App Status');
        return updatedLink?.href === getKibanaUrl('/app/app_status/arbitrary/path');
      });

      await navigateToApp('app_status');
      expect(await testSubjects.exists('appStatusApp')).to.eql(true);
      const currentUrl = await browser.getCurrentUrl();
      expect(Url.parse(currentUrl).pathname).to.eql('/app/app_status/arbitrary/path');
    });

    it('can change the state of the currently mounted app', async () => {
      await setAppStatus({
        status: AppStatus.accessible,
      });

      await navigateToApp('app_status');

      expect(await testSubjects.exists('appNotFoundPageContent')).to.eql(false);
      expect(await testSubjects.exists('appStatusApp')).to.eql(true);

      await setAppStatus({
        status: AppStatus.inaccessible,
      });

      expect(await testSubjects.exists('appNotFoundPageContent')).to.eql(true);
      expect(await testSubjects.exists('appStatusApp')).to.eql(false);

      await setAppStatus({
        status: AppStatus.accessible,
      });

      expect(await testSubjects.exists('appNotFoundPageContent')).to.eql(false);
      expect(await testSubjects.exists('appStatusApp')).to.eql(true);
    });
  });
}
