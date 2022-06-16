/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup, AppMountParameters, AppNavLinkStatus } from '@kbn/core/public';
import { PluginSetupContract as AlertingSetup } from '@kbn/alerting-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';

import {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '@kbn/triggers-actions-ui-plugin/public';

export interface TriggersActionsUiExamplePublicSetupDeps {
  alerting: AlertingSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  developerExamples: DeveloperExamplesSetup;
}

export interface TriggersActionsUiExamplePublicStartDeps {
  alerting: AlertingSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  data: DataPublicPluginStart;
}

export class TriggersActionsUiExamplePlugin
  implements Plugin<void, void, TriggersActionsUiExamplePublicSetupDeps>
{
  public setup(
    core: CoreSetup<TriggersActionsUiExamplePublicStartDeps, void>,
    setup: TriggersActionsUiExamplePublicSetupDeps
  ) {
    const { developerExamples } = setup;

    core.application.register({
      id: 'triggersActionsUiExample',
      title: 'Triggers Actions UI Example',
      navLinkStatus: AppNavLinkStatus.hidden,
      async mount(params: AppMountParameters) {
        const [coreStart, devStart] = await core.getStartServices();
        const { renderApp } = await import('./application');
        return renderApp(coreStart, devStart, params);
      },
    });

    developerExamples.register({
      appId: 'triggersActionsUiExample',
      title: 'Triggers Actions UI Shareable Components',
      description: 'Sandbox for triggers actions UI shareable components',
    });
  }
  public start() {}
  public stop() {}
}
