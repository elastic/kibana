/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, PageObjects, ScoutPage } from '@kbn/scout';
import { createLazyPageObject } from '@kbn/scout';
import { ActionPoliciesListPage } from './action_policies_list_page';
import { ActionPolicyFormPage } from './action_policy_form_page';
import { AgentChatPage } from './agent_chat_page';
import { AlertEpisodesListPage } from './alert_episodes_list_page';
import { AlertingNavigation } from './alerting_navigation';
import { OBSERVABILITY_MOUNT_CONFIG } from './alerting_mount_config';
import { ComposeDiscoverPage } from './compose_discover_page';
import { DiscoverAppMenu } from './discover_app_menu';
import { EpisodeDetailsPage } from './episode_details_page';
import { ExecutionHistoryPage } from './execution_history_page';
import { RuleBuilderPage } from './rule_builder_page';
import { RuleDetailsPage } from './rule_details_page';
import { RuleFormPage } from './rule_form_page';
import { RuleLibraryPage } from './rule_library_page';
import { RulesListPage } from './rules_list_page';
import { ThresholdBuilderPage } from './threshold_builder_page';

export { ActionPoliciesListPage } from './action_policies_list_page';
export { ActionPolicyFormPage } from './action_policy_form_page';
export { AgentChatPage } from './agent_chat_page';
export { AlertEpisodesListPage } from './alert_episodes_list_page';
export { AlertingNavigation } from './alerting_navigation';
export { ComposeDiscoverPage } from './compose_discover_page';
export { DiscoverAppMenu } from './discover_app_menu';
export { EpisodeDetailsPage } from './episode_details_page';
export { ExecutionHistoryPage } from './execution_history_page';
export { RuleBuilderPage } from './rule_builder_page';
export { RuleDetailsPage } from './rule_details_page';
export { RuleFormPage } from './rule_form_page';
export { RuleLibraryPage } from './rule_library_page';
export { RulesListPage } from './rules_list_page';
export { ThresholdBuilderPage } from './threshold_builder_page';
export { OBSERVABILITY_MOUNT_CONFIG } from './alerting_mount_config';
export type { AlertingMountConfig } from './alerting_mount_config';

export type AlertingPageObjects = PageObjects & {
  actionPoliciesList: ActionPoliciesListPage;
  actionPolicyForm: ActionPolicyFormPage;
  agentChat: AgentChatPage;
  alertEpisodesList: AlertEpisodesListPage;
  alertingNavigation: AlertingNavigation;
  composeDiscover: ComposeDiscoverPage;
  discoverAppMenu: DiscoverAppMenu;
  episodeDetails: EpisodeDetailsPage;
  executionHistory: ExecutionHistoryPage;
  ruleBuilder: RuleBuilderPage;
  ruleDetails: RuleDetailsPage;
  ruleForm: RuleFormPage;
  ruleLibrary: RuleLibraryPage;
  rulesList: RulesListPage;
  thresholdBuilder: ThresholdBuilderPage;
};

export const extendPageObjects = (
  pageObjects: PageObjects,
  page: ScoutPage,
  kbnUrl: KibanaUrl
): AlertingPageObjects => {
  const mountConfig = OBSERVABILITY_MOUNT_CONFIG;
  const discoverAppMenu = createLazyPageObject(DiscoverAppMenu, page);

  return {
    ...pageObjects,
    actionPoliciesList: createLazyPageObject(ActionPoliciesListPage, page, mountConfig),
    actionPolicyForm: createLazyPageObject(ActionPolicyFormPage, page, mountConfig),
    agentChat: createLazyPageObject(AgentChatPage, page),
    alertEpisodesList: createLazyPageObject(AlertEpisodesListPage, page, mountConfig),
    alertingNavigation: createLazyPageObject(AlertingNavigation, page, mountConfig),
    composeDiscover: createLazyPageObject(ComposeDiscoverPage, page),
    discoverAppMenu,
    episodeDetails: createLazyPageObject(EpisodeDetailsPage, page, kbnUrl, mountConfig),
    executionHistory: createLazyPageObject(ExecutionHistoryPage, page, kbnUrl, mountConfig),
    ruleBuilder: createLazyPageObject(RuleBuilderPage, page),
    ruleDetails: createLazyPageObject(RuleDetailsPage, page),
    ruleForm: createLazyPageObject(RuleFormPage, page, discoverAppMenu, mountConfig),
    ruleLibrary: createLazyPageObject(RuleLibraryPage, page, mountConfig),
    rulesList: createLazyPageObject(RulesListPage, page, mountConfig),
    thresholdBuilder: createLazyPageObject(ThresholdBuilderPage, page),
  };
};
