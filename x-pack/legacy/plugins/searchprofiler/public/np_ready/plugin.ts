/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Plugin,
  CoreStart,
  CoreSetup,
  PluginInitializerContext,
  ToastsStart,
} from 'src/core/public';

import { boot } from './application/boot';

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
        el: HTMLElement;
      };
    }
  ) {
    const { http } = core;
    const {
      __LEGACY: { I18nContext, licenseEnabled, notifications, formatAngularHttpError, el },
    } = plugins;
    core.application.register({
      id: 'searchprofiler',
      title: 'SearchProfiler',
      mount(ctx, params) {
        return boot({
          http,
          licenseEnabled,
          el,
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
