/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, CoreStart, Plugin } from 'src/core/public';
import { XPackMainPlugin } from '../../../xpack_main/server/xpack_main';
import { PLUGIN } from '../../common/constants';
import { Breadcrumb } from './application/breadcrumbs';

export interface Plugins {
  __LEGACY: {
    xpackInfo: XPackMainPlugin;
    refreshXpack: () => void;
    MANAGEMENT_BREADCRUMB: Breadcrumb;
  };
}

export class LicenseManagementUIPlugin implements Plugin<void, void, any, any> {
  setup({ application, notifications, http }: CoreSetup, { __LEGACY }: Plugins) {
    application.register({
      id: PLUGIN.ID,
      title: PLUGIN.TITLE,
      async mount(
        {
          core: {
            docLinks,
            i18n: { Context: I18nContext },
            chrome,
          },
        },
        { element }
      ) {
        const { boot } = await import('./application');
        return boot({
          legacy: { ...__LEGACY },
          I18nContext,
          toasts: notifications.toasts,
          docLinks,
          http,
          element,
          chrome,
        });
      },
    });
  }
  start(core: CoreStart, plugins: any) {}
  stop() {}
}
