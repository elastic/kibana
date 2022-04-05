/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import ReactDOM from 'react-dom';

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
import { DeveloperExamplesSetup } from '../../../../examples/developer_examples/public';

import { AppId, AppTitle, AppDescription } from '../common';
import { examplePage } from './components/example_page';
import { registerRuleTypes } from './rule_types';

export type Setup = void;
export type Start = void;

export interface Ow22pmuellrSetupDeps {
  alerting: AlertingSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  developerExamples: DeveloperExamplesSetup;
}

export interface Ow22pmuellrStartDeps {
  alerting: AlertingSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  charts: ChartsPluginStart;
  data: DataPublicPluginStart;
}

export class Ow22pmuellrPlugin
  implements Plugin<Setup, Start, Ow22pmuellrSetupDeps, Ow22pmuellrStartDeps>
{
  public setup(
    core: CoreSetup<Ow22pmuellrStartDeps, Start>,
    { alerting, triggersActionsUi, developerExamples }: Ow22pmuellrSetupDeps
  ) {
    core.application.register({
      id: AppId,
      title: AppTitle,
      navLinkStatus: AppNavLinkStatus.hidden,
      async mount({ element }: AppMountParameters) {
        ReactDOM.render(examplePage(AppTitle), element);
        return () => ReactDOM.unmountComponentAtNode(element);
      },
    });

    developerExamples.register({
      appId: AppId,
      title: AppTitle,
      description: AppDescription,
    });

    registerRuleTypes(triggersActionsUi);
  }

  public start() {}
  public stop() {}
}
