/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { firstValueFrom } from 'rxjs';
import type { Plugin, CoreSetup } from '@kbn/core/public';
import type { ILicense } from '@kbn/licensing-types';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import type { DevToolsSetup } from '@kbn/dev-tools-plugin/public';
import type { LicensingPluginSetup } from '@kbn/licensing-plugin/public';

import { PLUGIN } from '../common/constants';
import { registerFeature } from './register_feature';

export interface AppPublicPluginDependencies {
  licensing: LicensingPluginSetup;
  home: HomePublicPluginSetup;
  devTools: DevToolsSetup;
}

export class GrokDebuggerUIPlugin implements Plugin<void, void, AppPublicPluginDependencies> {
  setup(coreSetup: CoreSetup, plugins: AppPublicPluginDependencies) {
    registerFeature(plugins.home);

    const devTool = plugins.devTools.register({
      order: 6,
      title: i18n.translate('xpack.grokDebugger.displayName', {
        defaultMessage: 'Grok Debugger',
      }),
      id: PLUGIN.ID,
      enableRouting: false,
      mount: async ({ element }) => {
        const [coreStart] = await coreSetup.getStartServices();
        const license: ILicense = await firstValueFrom(plugins.licensing.license$);
        const { renderApp } = await import('./render_app');
        return renderApp(license, element, coreStart);
      },
    });

    plugins.licensing.license$.subscribe((license) => {
      if (!license.isActive && !devTool.isDisabled()) {
        devTool.disable();
      } else if (devTool.isDisabled()) {
        devTool.enable();
      }
    });
  }

  start() {}

  stop() {}
}
