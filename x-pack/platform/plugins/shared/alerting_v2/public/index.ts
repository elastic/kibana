/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Container, ContainerModule } from 'inversify';
import { OnSetup, PluginSetup, Start } from '@kbn/core-di';
import { CoreSetup, CoreStart } from '@kbn/core-di-browser';
import type { SharePluginSetup } from '@kbn/share-plugin/public';
import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
import { WorkflowApi } from '@kbn/workflows-ui';
import { ActionPoliciesApi } from './services/action_policies_api';
import { ExecutionHistoryApi } from './services/execution_history_api';
import { RuleChangeHistoryApi } from './services/rule_change_history_api';
import { RulesApi } from './services/rules_api';
import { RuleTemplatesApi } from './services/rule_templates_api';
import { UserCapabilities } from './services/user_capabilities';
import { createStartContract } from './start_contract';
import { registerOnSetup } from './setup';

export type {
  AlertingV2PublicStart,
  CreateRuleOptionsFlyoutLegacyItem,
  AlertingV2PageProps,
  PrivilegeCheck,
} from './types';
export type { CreateRuleOptionsFlyoutProps } from './create_rule_options_flyout';
export type { AlertingV2HostApp, CreateAlertingV2HostApp } from '../common/locators';
export type {
  AlertingV2RulesLocatorParams,
  AlertingV2RuleLibraryLocatorParams,
  AlertingV2EpisodesLocatorParams,
  AlertingV2ActionPoliciesLocatorParams,
  AlertingV2ExecutionHistoryLocatorParams,
} from '../common/locators';
export {
  useV2RulesTabNewBadge,
  V2_RULES_TAB_NEW_BADGE_VISITED_STORAGE_KEY,
} from './hooks/use_v2_rules_tab_new_badge';

const pluginModule = new ContainerModule(({ bind }) => {
  bind(RulesApi).toSelf().inSingletonScope();
  bind(ActionPoliciesApi).toSelf().inSingletonScope();
  bind(ExecutionHistoryApi).toSelf().inSingletonScope();
  bind(RuleTemplatesApi).toSelf().inSingletonScope();
  bind(RuleChangeHistoryApi).toSelf().inSingletonScope();
  bind(UserCapabilities).toSelf().inSingletonScope();
  bind(WorkflowApi)
    .toResolvedValue((http) => new WorkflowApi(http), [CoreStart('http')])
    .inSingletonScope();
  bind(Start).toResolvedValue(createStartContract, [Container]).inSingletonScope();
  bind(OnSetup).toResolvedValue(registerOnSetup, [
    CoreSetup('getStartServices'),
    PluginSetup<WorkflowsExtensionsPublicPluginSetup>('workflowsExtensions'),
    CoreSetup('analytics'),
    PluginSetup<SharePluginSetup>('share'),
  ]);
});

export { pluginModule as module };
