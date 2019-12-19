/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CoreSetup,
  CoreStart,
  PluginInitializerContext,
  Plugin as IPlugin,
} from '../../../../../../src/core/public';
import { DataPublicPluginStart } from '../../../../../../src/plugins/data/public';
import { IEmbeddableStart } from '../../../../../../src/plugins/embeddable/public';
import { Start as InspectorStart } from '../../../../../../src/plugins/inspector/public';
import { IUiActionsStart } from '../../../../../../src/plugins/ui_actions/public';

import { DEFAULT_KBN_VERSION, DEFAULT_TIMEZONE_BROWSER } from '../../common/constants';
export { CoreSetup, CoreStart };

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SetupPlugins {}
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
  public name = 'siem';
  constructor(
    // @ts-ignore this is added to satisfy the New Platform typing constraint,
    // but we're not leveraging any of its functionality yet.
    private readonly initializerContext: PluginInitializerContext
  ) {}

  public setup(core: CoreSetup, plugins: SetupPlugins) {
    // TODO(rylnd): These are unknown by uiSettings by default
    core.uiSettings.set(DEFAULT_KBN_VERSION, '8.0.0');
    core.uiSettings.set(DEFAULT_TIMEZONE_BROWSER, 'UTC');

    core.application.register({
      id: this.name,
      title: 'Siem',
      async mount(context, params) {
        const [coreStart, pluginsStart] = await core.getStartServices();
        const { renderApp } = await import('./start_app');

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
