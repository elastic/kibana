/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OnechatPluginSetup } from '@kbn/onechat-plugin/server';
import type { ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { CasesServerStart } from '@kbn/cases-plugin/server';
import type { RuleRegistryPluginStart } from '@kbn/rule-registry-plugin/server';
import type { AlertingServerStart } from '@kbn/alerting-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { CatchupAgentConfigType } from './config';

export type { CatchupAgentConfigType };

export interface CatchupAgentPluginSetup {
  // Setup contract (empty for now)
}

export interface CatchupAgentPluginStart {
  getCasesClient: CasesServerStart['getCasesClientWithRequest'] | undefined;
  getRulesClient: AlertingServerStart['getRulesClientWithRequest'] | undefined;
  spaces: SpacesPluginStart | undefined;
  ruleRegistry: RuleRegistryPluginStart | undefined;
  actions: ActionsPluginStart | undefined;
}

export interface CatchupAgentSetupDependencies {
  onechat: OnechatPluginSetup;
  workflowsManagement?: WorkflowsServerPluginSetup;
}

export interface CatchupAgentStartDependencies {
  actions: ActionsPluginStart;
  security?: SecurityPluginStart;
  cases?: CasesServerStart;
  ruleRegistry?: RuleRegistryPluginStart;
  alerting?: AlertingServerStart;
  spaces?: SpacesPluginStart;
}
