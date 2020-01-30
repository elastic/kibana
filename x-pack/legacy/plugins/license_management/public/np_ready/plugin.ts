/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, CoreStart, Plugin } from 'src/core/public';
import { map, filter } from 'rxjs/operators';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { PulseInstruction } from 'src/core/public/pulse/channel';
import { XPackMainPlugin } from '../../../xpack_main/server/xpack_main';
import { PLUGIN, HOURLY_COST } from '../../common/constants';
import { Breadcrumb } from './application/breadcrumbs';

export interface Plugins {
  __LEGACY: {
    xpackInfo: XPackMainPlugin;
    refreshXpack: () => void;
    MANAGEMENT_BREADCRUMB: Breadcrumb;
  };
}

interface CloudCosts extends PulseInstruction {
  cloudCosts: { hourlyCost: number };
}

export class LicenseManagementUIPlugin implements Plugin<void, void, any, any> {
  setup({ application, notifications, http, pulse }: CoreSetup, { __LEGACY }: Plugins) {
    pulse
      .getChannel('deployment')
      .instructions$()
      .pipe(
        map(instructions =>
          instructions.find(instruction => !!(instruction as CloudCosts).cloudCosts)
        ),
        filter((instruction): instruction is CloudCosts => Boolean(instruction))
      )
      .subscribe(({ cloudCosts }) => {
        localStorage.setItem(HOURLY_COST, `${cloudCosts.hourlyCost}`);
      });

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
