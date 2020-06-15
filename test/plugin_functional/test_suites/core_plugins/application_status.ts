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

import url from 'url';
import expect from '@kbn/expect';
import {
  AppNavLinkStatus,
  AppStatus,
  AppUpdatableFields,
} from '../../../../src/core/public/application/types';
import { PluginFunctionalProviderContext } from '../../services';
import '../../plugins/core_app_status/public/types';

const getKibanaUrl = (pathname?: string, search?: string) =>
  url.format({
    protocol: 'http:',
    hostname: process.env.TEST_KIBANA_HOST || 'localhost',
    port: process.env.TEST_KIBANA_PORT || '5620',
    pathname,
    search,
  });

// eslint-disable-next-line import/no-default-export
export default function ({ getService, getPageObjects }: PluginFunctionalProviderContext) {
  const PageObjects = getPageObjects(['common']);
  const browser = getService('browser');
  const appsMenu = getService('appsMenu');
  const testSubjects = getService('testSubjects');

  const setAppStatus = async (s: Partial<AppUpdatableFields>) => {
    return browser.executeAsync(async (status, cb) => {
      window.__coreAppStatus.setAppStatus(status);
      cb();
    }, s);
  };

  const navigateToApp = async (i: string) => {
    return await browser.executeAsync(async (appId, cb) => {
      await window.__coreAppStatus.navigateToApp(appId);
      cb();
    }, i);
  };

  // FLAKY: https://github.com/elastic/kibana/issues/65423
  describe.skip('application status management', () => {
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
      let link = await appsMenu.getLink('App Status');
      expect(link!.href).to.eql(getKibanaUrl('/app/app_status'));

      await setAppStatus({
        defaultPath: '/arbitrary/path',
      });

      link = await appsMenu.getLink('App Status');
      expect(link!.href).to.eql(getKibanaUrl('/app/app_status/arbitrary/path'));

      await navigateToApp('app_status');
      expect(await testSubjects.exists('appStatusApp')).to.eql(true);
      expect(await browser.getCurrentUrl()).to.eql(getKibanaUrl('/app/app_status/arbitrary/path'));
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
