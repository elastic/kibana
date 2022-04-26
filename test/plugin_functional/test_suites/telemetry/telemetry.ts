/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { KBN_SCREENSHOT_MODE_ENABLED_KEY } from '@kbn/screenshot-mode-plugin/public';
import { PluginFunctionalProviderContext } from '../../services';

export default function ({ getService, getPageObjects }: PluginFunctionalProviderContext) {
  const browser = getService('browser');
  const PageObjects = getPageObjects(['common']);

  describe('Telemetry service', () => {
    const checkCanSendTelemetry = (): Promise<boolean> => {
      return browser.executeAsync<boolean>((cb) => {
        (window as unknown as Record<string, () => Promise<boolean>>)
          ._checkCanSendTelemetry()
          .then(cb);
      });
    };

    after(async () => {
      await browser.removeLocalStorageItem(KBN_SCREENSHOT_MODE_ENABLED_KEY);
      await browser.executeAsync<void>((cb) => {
        (window as unknown as Record<string, () => Promise<boolean>>)
          ._resetTelemetry()
          .then(() => cb());
      });
    });

    it('detects that telemetry cannot be sent in screenshot mode', async () => {
      await PageObjects.common.navigateToApp('home');
      expect(await checkCanSendTelemetry()).to.be(true);

      await browser.setLocalStorageItem(KBN_SCREENSHOT_MODE_ENABLED_KEY, 'true');
      await PageObjects.common.navigateToApp('home');

      expect(await checkCanSendTelemetry()).to.be(false);
    });
  });
}
