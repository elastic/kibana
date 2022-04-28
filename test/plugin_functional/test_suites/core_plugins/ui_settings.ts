/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { PluginFunctionalProviderContext } from '../../services';
import '@kbn/core-provider-plugin/types';

export default function ({ getService, getPageObjects }: PluginFunctionalProviderContext) {
  const PageObjects = getPageObjects(['common']);
  const browser = getService('browser');
  const supertest = getService('supertest');

  describe('ui settings', function () {
    before(async () => {
      await PageObjects.common.navigateToApp('settings');
    });

    it('client plugins have access to registered settings', async () => {
      const settings = await browser.execute(() => {
        return window._coreProvider.setup.core.uiSettings.getAll().ui_settings_plugin;
      });

      expect(settings).to.eql({
        category: ['any'],
        description: 'just for testing',
        name: 'from_ui_settings_plugin',
        value: '2',
      });

      const settingsValue = await browser.execute(() => {
        return window._coreProvider.setup.core.uiSettings.get('ui_settings_plugin');
      });

      expect(settingsValue).to.be('2');

      const settingsValueViaObservables = await browser.executeAsync(async (callback) => {
        window._coreProvider.setup.core.uiSettings
          .get$('ui_settings_plugin')
          .subscribe((v) => callback(v));
      });

      expect(settingsValueViaObservables).to.be('2');
    });

    it('server plugins have access to registered settings', async () => {
      await supertest.get('/api/ui-settings-plugin').expect(200).expect({ uiSettingsValue: 2 });
    });
  });
}
