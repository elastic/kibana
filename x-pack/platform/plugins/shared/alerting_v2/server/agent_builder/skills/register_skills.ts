/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import type { ManageActionPolicyToolDeps } from '../tools/manage_action_policy';
import { createActionPolicyManagementSkill } from './action_policy_management_skill';
import { createRuleManagementSkill } from './rule_management_skill';

export interface RegisterSkillsDeps extends ManageActionPolicyToolDeps {
  security: SecurityPluginStart | undefined;
}

export const registerSkills = (
  agentBuilder: AgentBuilderPluginSetup,
  deps: RegisterSkillsDeps
): void => {
  agentBuilder.skills.register(createRuleManagementSkill({ security: deps.security }));
  agentBuilder.skills.register(createActionPolicyManagementSkill(deps));
};
