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
  NotificationsSetup,
} from '../../../../../../src/core/public';

import { boot } from './application/boot';

export class SearchProfilerUIPlugin implements Plugin {
  constructor(ctx: PluginInitializerContext) {}

  private startDeps: CoreStart = null as any;

  async setup(
    core: CoreSetup,
    plugins: {
      __LEGACY: {
        I18nContext: any;
        licenseEnabled: boolean;
        el: HTMLElement;
        notifications: NotificationsSetup;
        formatAngularHttpError: any;
      };
    }
  ) {
    const { http } = this.startDeps;
    const {
      __LEGACY: { I18nContext, licenseEnabled, el, notifications, formatAngularHttpError },
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

  async start(core: CoreStart, plugins: any) {
    this.startDeps = core;
  }

  async stop() {}
}
