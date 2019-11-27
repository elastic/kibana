/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, CoreStart, Plugin } from 'src/core/public';
import { XPackMainPlugin } from '../../../xpack_main/xpack_main';
import { PLUGIN } from '../../common/constants';

export interface Plugins {
  __LEGACY: {
    autoLogout: () => void;
    xpackInfo: XPackMainPlugin;
    I18nContext: any;
    kbnUrlWrapper: { change: (url: string) => void };
    refreshXpack: () => void;
  };
}

export class LicenseManagementUIPlugin implements Plugin<void, void, any, any> {
  setup({ application, notifications, http }: CoreSetup, { __LEGACY }: Plugins) {
    application.register({
      id: PLUGIN.ID,
      title: PLUGIN.TITLE,
      async mount({ core: { docLinks } }, { element }) {
        const { boot } = await import('./application');
        return boot({ ...__LEGACY, toasts: notifications.toasts, docLinks, http, element });
      },
    });
  }
  start(core: CoreStart, plugins: any) {}
  stop() {}
}
