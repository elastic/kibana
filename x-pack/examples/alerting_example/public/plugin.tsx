/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Plugin,
  CoreSetup,
  AppMountParameters,
  AppNavLinkStatus,
} from '../../../../src/core/public';
import { PluginSetupContract as AlertingSetup } from '../../../plugins/alerting/public';
import { ChartsPluginStart } from '../../../../src/plugins/charts/public';
import {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '../../../plugins/triggers_actions_ui/public';
import { DataPublicPluginStart } from '../../../../src/plugins/data/public';
import { getAlertType as getAlwaysFiringAlertType } from './alert_types/always_firing';
import { getAlertType as getPeopleInSpaceAlertType } from './alert_types/astros';
import { registerNavigation } from './alert_types';
import { DeveloperExamplesSetup } from '../../../../examples/developer_examples/public';

export type Setup = void;
export type Start = void;

export interface AlertingExamplePublicSetupDeps {
  alerting: AlertingSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  developerExamples: DeveloperExamplesSetup;
}

export interface AlertingExamplePublicStartDeps {
  alerting: AlertingSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  charts: ChartsPluginStart;
  data: DataPublicPluginStart;
}

export class AlertingExamplePlugin implements Plugin<Setup, Start, AlertingExamplePublicSetupDeps> {
  public setup(
    core: CoreSetup<AlertingExamplePublicStartDeps, Start>,
    { alerting, triggersActionsUi, developerExamples }: AlertingExamplePublicSetupDeps
  ) {
    core.application.register({
      id: 'AlertingExample',
      title: 'Alerting Example',
      navLinkStatus: AppNavLinkStatus.hidden,
      async mount(params: AppMountParameters) {
        const [coreStart, depsStart] = await core.getStartServices();
        const { renderApp } = await import('./application');
        return renderApp(coreStart, depsStart, params);
      },
    });

    triggersActionsUi.alertTypeRegistry.register(getAlwaysFiringAlertType());
    triggersActionsUi.alertTypeRegistry.register(getPeopleInSpaceAlertType());

    registerNavigation(alerting);

    developerExamples.register({
      appId: 'AlertingExample',
      title: 'Alerting',
      description: `This alerting example walks you through how to set up a new alert.`,
      links: [
        {
          label: 'README',
          href: 'https://github.com/elastic/kibana/tree/master/x-pack/plugins/alerting',
          iconType: 'logoGithub',
          size: 's',
          target: '_blank',
        },
      ],
    });
  }

  public start() {}
  public stop() {}
}
