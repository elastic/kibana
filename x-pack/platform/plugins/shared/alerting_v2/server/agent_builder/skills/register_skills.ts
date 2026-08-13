/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import {
  ACTION_POLICY_MANAGEMENT_SKILL_ID,
  RULE_MANAGEMENT_SKILL_ID,
} from '@kbn/alerting-v2-constants';
import type { ManageActionPolicyToolDeps } from '../tools/manage_action_policy';
import type { ManageRuleToolDeps } from '../tools/manage_rule';
import { ALERTING_LOG_CODES } from '../../lib/errors/error_codes';
import { createActionPolicyManagementSkill } from './action_policy_management_skill';
import { createRuleManagementSkill } from './rule_management_skill';

export type RegisterSkillsDeps = ManageRuleToolDeps & ManageActionPolicyToolDeps;

/**
 * Registers Alerting v2 Agent Builder skills. Any failure is logged and
 * rethrown so Kibana start aborts — skills cannot run in a degraded state.
 */
export const registerSkills = (
  agentBuilder: AgentBuilderPluginSetup,
  deps: RegisterSkillsDeps
): void => {
  const { logger } = deps;
  const skills = [
    {
      id: RULE_MANAGEMENT_SKILL_ID,
      create: () => createRuleManagementSkill(deps),
    },
    {
      id: ACTION_POLICY_MANAGEMENT_SKILL_ID,
      create: () => createActionPolicyManagementSkill(deps),
    },
  ] as const;

  for (const { id, create } of skills) {
    try {
      agentBuilder.skills.register(create());
    } catch (e) {
      logger.error({
        message: 'Failed to register agent builder skill',
        code: ALERTING_LOG_CODES.AGENT_BUILDER_SKILL_REGISTER_FAILED,
        labels: { skill_id: id },
        error: e,
      });
      throw e;
    }
  }

  logger.debug({
    message: () => 'Agent builder skills and attachments registered',
  });
};
