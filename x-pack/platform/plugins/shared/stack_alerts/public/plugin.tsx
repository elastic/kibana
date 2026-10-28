/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { TriggersAndActionsUIPublicPluginSetup } from '@kbn/triggers-actions-ui-plugin/public';
import type { PluginSetupContract as AlertingSetup } from '@kbn/alerting-plugin/public';
import type { AlertingV2PublicSetup } from '@kbn/alerting-v2-plugin/public';
import { ES_QUERY_ID } from '@kbn/rule-data-utils';
import { registerRuleTypes } from './rule_types';

export type Setup = void;
export type Start = void;

export interface StackAlertsPublicSetupDeps {
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  alerting: AlertingSetup;
  alertingVTwo?: AlertingV2PublicSetup;
}

export class StackAlertsPublicPlugin implements Plugin<Setup, Start, StackAlertsPublicSetupDeps> {
  private readonly isServerless: boolean;
  constructor(initializerContext: PluginInitializerContext) {
    this.isServerless = initializerContext.env.packageInfo.buildFlavor === 'serverless';
  }

  public setup(
    core: CoreSetup,
    { triggersActionsUi, alerting, alertingVTwo }: StackAlertsPublicSetupDeps
  ) {
    registerRuleTypes(
      {
        ruleTypeRegistry: triggersActionsUi.ruleTypeRegistry,
        alerting,
      },
      this.isServerless
    );

    alertingVTwo?.ruleMigrations.register({
      ruleTypeId: ES_QUERY_ID,
      load: () =>
        import('./rule_types/es_query/migration/es_query_migration').then(
          ({ esQueryRuleMigration }) => esQueryRuleMigration
        ),
    });
  }

  public start() {}
  public stop() {}
}
