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
import { EmbeddableStart } from '../../../../../src/plugins/embeddable/public';
import { Start as NewsfeedStart } from '../../../../../src/plugins/newsfeed/public';
import { Start as InspectorStart } from '../../../../../src/plugins/inspector/public';
import { UiActionsStart } from '../../../../../src/plugins/ui_actions/public';
import { UsageCollectionSetup } from '../../../../../src/plugins/usage_collection/public';
import { initTelemetry } from './lib/telemetry';
import { KibanaServices } from './lib/kibana';

import { serviceNowActionType } from './lib/connectors';

import {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '../../../../plugins/triggers_actions_ui/public';
import { SecurityPluginSetup } from '../../../../plugins/security/public';

export { AppMountParameters, CoreSetup, CoreStart, PluginInitializerContext };

export interface SetupPlugins {
  home: HomePublicPluginSetup;
  security: SecurityPluginSetup;
  triggers_actions_ui: TriggersAndActionsUIPublicPluginSetup;
  usageCollection: UsageCollectionSetup;
}
export interface StartPlugins {
  data: DataPublicPluginStart;
  embeddable: EmbeddableStart;
  inspector: InspectorStart;
  newsfeed?: NewsfeedStart;
  security: SecurityPluginSetup;
  triggers_actions_ui: TriggersAndActionsUIPublicPluginStart;
  uiActions: UiActionsStart;
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
    initTelemetry(plugins.usageCollection, this.id);

    const security = plugins.security;

    core.application.register({
      id: this.id,
      title: this.name,
      async mount(context, params) {
        const [coreStart, startPlugins] = await core.getStartServices();
        const { renderApp } = await import('./app');

        plugins.triggers_actions_ui.actionTypeRegistry.register(serviceNowActionType());
        return renderApp(coreStart, { ...startPlugins, security } as StartPlugins, params);
      },
    });

    return {};
  }

  public start(core: CoreStart, plugins: StartPlugins) {
    KibanaServices.init({ ...core, ...plugins });

    return {};
  }

  public stop() {
    return {};
  }
}
