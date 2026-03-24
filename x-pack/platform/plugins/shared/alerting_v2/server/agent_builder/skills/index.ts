/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import { alertInvestigationSkill } from './alert_investigation_skill';
import { alertRuleCreationSkill } from './alert_rule_creation_skill';
import { alertRuleTuningSkill } from './alert_rule_tuning_skill';
import { alertingRulesOverviewSkill } from './alerting_rules_overview_skill';
import { alertEpisodesSkill } from './alert_episodes_skill';
import { dataDiscoverySkill } from './data_discovery_skill';

export const registerSkills = (agentBuilder: AgentBuilderPluginSetup) => {
  // P0 — data discovery & profiling
  agentBuilder.skills.register(dataDiscoverySkill);

  // P1 — investigation, creation & episodes
  agentBuilder.skills.register(alertInvestigationSkill);
  agentBuilder.skills.register(alertRuleCreationSkill);
  agentBuilder.skills.register(alertEpisodesSkill);

  // P2 — tuning
  agentBuilder.skills.register(alertRuleTuningSkill);

  // P3 — overview & workflow investigation
  // notificationPolicyManagementSkill disabled — notification flow is handled
  // by the rule creation skill's Phase 3 to avoid conflicting guidance
  agentBuilder.skills.register(alertingRulesOverviewSkill);
  // workflowTriggerInvestigationSkill disabled — workflow investigation may
  // conflict with the rule creation skill's notification flow during testing
  // agentBuilder.skills.register(workflowTriggerInvestigationSkill);
};
