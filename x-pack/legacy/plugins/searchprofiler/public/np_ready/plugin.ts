/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import {
  Plugin,
  CoreStart,
  CoreSetup,
  PluginInitializerContext,
  ToastsStart,
} from 'src/core/public';

import { DevToolsSetup } from '../../../../../../src/plugins/dev_tools/public';

export class SearchProfilerUIPlugin implements Plugin {
  constructor(ctx: PluginInitializerContext) {}

  async setup(
    core: CoreSetup,
    plugins: {
      __LEGACY: {
        I18nContext: any;
        licenseEnabled: boolean;
        notifications: ToastsStart;
        formatAngularHttpError: any;
      };
      dev_tools: DevToolsSetup;
    }
  ) {
    const { http } = core;
    const {
      __LEGACY: { I18nContext, licenseEnabled, notifications, formatAngularHttpError },
      dev_tools,
    } = plugins;
    dev_tools.register({
      id: 'searchprofiler',
      title: i18n.translate('xpack.searchProfiler.pageDisplayName', {
        defaultMessage: 'Search Profiler',
      }),
      order: 5,
      enableRouting: false,
      async mount(ctx, params) {
        const { boot } = await import('./application/boot');
        return boot({
          http,
          licenseEnabled,
          el: params.element,
          I18nContext,
          notifications,
          formatAngularHttpError,
        });
      },
    });
  }

  async start(core: CoreStart, plugins: any) {}

  async stop() {}
}
