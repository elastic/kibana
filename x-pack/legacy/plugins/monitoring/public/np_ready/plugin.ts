/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { App, CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'kibana/public';

export class MonitoringPlugin implements Plugin {
  constructor(ctx: PluginInitializerContext) {}

  public setup(core: CoreSetup, plugins: any) {
    const app: App = {
      id: 'monitoring',
      title: 'Monitoring',
      mount: async (context, params) => {
        const { AngularApp } = await import('../np_imports/angular');
        const monitoringApp = new AngularApp(context, params);
        return monitoringApp.destroy;
      },
    };

    core.application.register(app);
  }

  public start(core: CoreStart, plugins: any) {}
  public stop() {}
}
