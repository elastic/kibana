/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import type { ManageActionPolicyToolDeps } from '../tools/manage_action_policy';
import { createActionPolicyManagementSkill } from './action_policy_management_skill';
import { createRuleManagementSkill } from './rule_management_skill';

export type RegisterSkillsDeps = ManageActionPolicyToolDeps;

export const registerSkills = (
  agentBuilder: AgentBuilderPluginSetup,
  deps: RegisterSkillsDeps
): void => {
  agentBuilder.skills.register(
    createRuleManagementSkill({ getPrivilegeChecker: deps.getPrivilegeChecker })
  );
  agentBuilder.skills.register(createActionPolicyManagementSkill(deps));
};
