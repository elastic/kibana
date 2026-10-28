/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import { CLASSIC_TO_UNIVERSAL_RULE_MIGRATION_SKILL_ID } from '@kbn/alerting-v2-constants';
import { MIGRATION_LOG_CODES } from '../lib/log_codes';
import {
  createClassicToUniversalRuleMigrationSkill,
  type ClassicToUniversalRuleMigrationSkillDeps,
} from './skills/classic_to_universal_rule_migration_skill';

/** Registers the rule migration Agent Builder skill; a failure is logged, not thrown. */
export const registerSkills = (
  agentBuilder: Pick<AgentBuilderPluginSetup, 'skills'>,
  deps: ClassicToUniversalRuleMigrationSkillDeps
): void => {
  try {
    agentBuilder.skills.register(createClassicToUniversalRuleMigrationSkill(deps));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    deps.logger.error(
      `Failed to register agent builder skill. Id: ${CLASSIC_TO_UNIVERSAL_RULE_MIGRATION_SKILL_ID}: ${message}`,
      {
        labels: {
          skill_id: CLASSIC_TO_UNIVERSAL_RULE_MIGRATION_SKILL_ID,
          code: MIGRATION_LOG_CODES.AGENT_BUILDER_SKILL_REGISTER_FAILED,
        },
      }
    );
  }
};
