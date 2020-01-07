/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  PluginInitializerContext,
  Plugin as IPlugin,
} from '../../../../../src/core/public';
import { HomePublicPluginSetup } from '../../../../../src/plugins/home/public';
import { DataPublicPluginStart } from '../../../../../src/plugins/data/public';
import { IEmbeddableStart } from '../../../../../src/plugins/embeddable/public';
import { Start as InspectorStart } from '../../../../../src/plugins/inspector/public';
import { IUiActionsStart } from '../../../../../src/plugins/ui_actions/public';

export { AppMountParameters, CoreSetup, CoreStart, PluginInitializerContext };

export interface SetupPlugins {
  home: HomePublicPluginSetup;
}
export interface StartPlugins {
  data: DataPublicPluginStart;
  embeddable: IEmbeddableStart;
  inspector: InspectorStart;
  uiActions: IUiActionsStart;
}
export type StartServices = CoreStart & StartPlugins;

export type Setup = ReturnType<Plugin['setup']>;
export type Start = ReturnType<Plugin['start']>;

export class Plugin implements IPlugin<Setup, Start> {
  public id = 'siem';
  public name = 'SIEM';
  constructor(
    // @ts-ignore this is added to satisfy the New Platform typing constraint,
    // but we're not leveraging any of its functionality yet.
    private readonly initializerContext: PluginInitializerContext
  ) {}

  public setup(core: CoreSetup, plugins: SetupPlugins) {
    core.application.register({
      id: this.id,
      title: this.name,
      async mount(context, params) {
        const [coreStart, pluginsStart] = await core.getStartServices();
        const { renderApp } = await import('./app');

        return renderApp(coreStart, pluginsStart as StartPlugins, params);
      },
    });

    return {};
  }

  public start(core: CoreStart, plugins: StartPlugins) {
    return {};
  }

  public stop() {
    return {};
  }
}
