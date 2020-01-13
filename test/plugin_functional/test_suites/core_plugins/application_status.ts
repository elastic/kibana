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
import {
  AppNavLinkStatus,
  AppStatus,
  AppUpdatableFields,
} from '../../../../src/core/public/application/types';
import { PluginFunctionalProviderContext } from '../../services';
import { CoreAppStatusPluginStart } from '../../plugins/core_app_status/public/plugin';
import '../../plugins/core_provider_plugin/types';

// eslint-disable-next-line import/no-default-export
export default function({ getService, getPageObjects }: PluginFunctionalProviderContext) {
  const PageObjects = getPageObjects(['common']);
  const browser = getService('browser');
  const appsMenu = getService('appsMenu');

  const setAppStatus = async (s: Partial<AppUpdatableFields>) => {
    await browser.executeAsync(async (status: Partial<AppUpdatableFields>, cb: Function) => {
      const plugin = window.__coreProvider.start.plugins
        .core_app_status as CoreAppStatusPluginStart;
      plugin.setAppStatus(status);
      cb();
    }, s);
  };

  const navigateToApp = async (i: string): Promise<{ error?: string }> => {
    return (await browser.executeAsync(async (appId, cb: Function) => {
      // navigating in legacy mode performs a page refresh
      // and webdriver seems to re-execute the script after the reload
      // as it considers it didn't end on the previous session.
      // however when testing navigation to NP app, __coreProvider is not accessible
      // so we need to check for existence.
      if (!window.__coreProvider) {
        cb({});
      }
      const plugin = window.__coreProvider.start.plugins
        .core_app_status as CoreAppStatusPluginStart;
      try {
        await plugin.navigateToApp(appId);
        cb({});
      } catch (e) {
        cb({
          error: e.message,
        });
      }
    }, i)) as any;
  };

  describe('application status management', () => {
    beforeEach(async () => {
      await PageObjects.common.navigateToApp('settings');
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

      await setAppStatus({
        navLinkStatus: AppNavLinkStatus.visible,
        tooltip: 'Some tooltip',
      });
      link = await appsMenu.getLink('Some tooltip'); // the tooltip replaces the name in the selector we use.
      expect(link).not.to.eql(undefined);
      expect(link!.disabled).to.eql(false);
    });

    it('shows an error when navigating to an inaccessible app', async () => {
      await setAppStatus({
        status: AppStatus.inaccessible,
      });

      const result = await navigateToApp('app_status');
      expect(result.error).to.contain(
        'Trying to navigate to an inaccessible application: app_status'
      );
    });

    it('allows to navigate to an accessible app', async () => {
      await setAppStatus({
        status: AppStatus.accessible,
      });

      const result = await navigateToApp('app_status');
      expect(result.error).to.eql(undefined);
    });
  });
}
