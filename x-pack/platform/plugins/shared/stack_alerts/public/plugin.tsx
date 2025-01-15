/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { TriggersAndActionsUIPublicPluginSetup } from '@kbn/triggers-actions-ui-plugin/public';
import { PluginSetupContract as AlertingSetup } from '@kbn/alerting-plugin/public';
import { registerRuleTypes } from './rule_types';

export type Setup = void;
export type Start = void;

export interface StackAlertsPublicSetupDeps {
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  alerting: AlertingSetup;
}

export class StackAlertsPublicPlugin implements Plugin<Setup, Start, StackAlertsPublicSetupDeps> {
  private readonly isServerless: boolean;
  constructor(initializerContext: PluginInitializerContext) {
    this.isServerless = initializerContext.env.packageInfo.buildFlavor === 'serverless';
  }

  public setup(core: CoreSetup, { triggersActionsUi, alerting }: StackAlertsPublicSetupDeps) {
    registerRuleTypes(
      {
        ruleTypeRegistry: triggersActionsUi.ruleTypeRegistry,
        alerting,
      },
      this.isServerless
    );
  }

  public start() {}
  public stop() {}
}
