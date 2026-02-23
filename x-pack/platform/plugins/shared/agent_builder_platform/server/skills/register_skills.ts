/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginSetupDependencies } from '../types';
import { PLATFORM_ALERTING_RULES_SKILL } from './platform_alerting_rules_skill';
import { PLATFORM_CASES_SKILL } from './platform_cases_skill';
import { PLATFORM_CONNECTORS_ACTIONS_SKILL } from './platform_connectors_actions_skill';
import { PLATFORM_DATA_VIEWS_SKILL } from './platform_data_views_skill';
import { PLATFORM_GENERATE_ESQL_SKILL } from './platform_generate_esql_skill';
import { PLATFORM_PRIVILEGES_SKILL } from './platform_privileges_skill';
import { PLATFORM_SAVED_OBJECTS_SKILL } from './platform_saved_objects_skill';
import { PLATFORM_SEARCH_SKILL } from './platform_search_skill';
import { PLATFORM_SPACES_SKILL } from './platform_spaces_skill';
import { PLATFORM_TAGS_SKILL } from './platform_tags_skill';
import { PLATFORM_UI_SETTINGS_SKILL } from './platform_ui_settings_skill';
import { PLATFORM_VISUALIZATION_SKILL } from './platform_visualization_skill';
import { PLATFORM_WORKFLOWS_LOGS_SKILL } from './platform_workflows_logs_skill';
import { PLATFORM_WORKFLOW_GENERATION_SKILL } from './platform_workflow_generation_skill';
import { PLATFORM_WORKFLOWS_SKILL } from './platform_workflows_skill';

export const registerSkills = async (setupDeps: PluginSetupDependencies): Promise<void> => {
  const { agentBuilder } = setupDeps;
  agentBuilder.skills.register(PLATFORM_WORKFLOW_GENERATION_SKILL);
  await Promise.all([
    agentBuilder.skill.registerSkill(PLATFORM_SEARCH_SKILL),
    agentBuilder.skill.registerSkill(PLATFORM_VISUALIZATION_SKILL),
    agentBuilder.skill.registerSkill(PLATFORM_SAVED_OBJECTS_SKILL),
    agentBuilder.skill.registerSkill(PLATFORM_DATA_VIEWS_SKILL),
    agentBuilder.skill.registerSkill(PLATFORM_ALERTING_RULES_SKILL),
    agentBuilder.skill.registerSkill(PLATFORM_CONNECTORS_ACTIONS_SKILL),
    agentBuilder.skill.registerSkill(PLATFORM_GENERATE_ESQL_SKILL),
    agentBuilder.skill.registerSkill(PLATFORM_WORKFLOWS_SKILL),
    agentBuilder.skill.registerSkill(PLATFORM_WORKFLOWS_LOGS_SKILL),
    agentBuilder.skill.registerSkill(PLATFORM_CASES_SKILL),
    agentBuilder.skill.registerSkill(PLATFORM_SPACES_SKILL),
    agentBuilder.skill.registerSkill(PLATFORM_TAGS_SKILL),
    agentBuilder.skill.registerSkill(PLATFORM_UI_SETTINGS_SKILL),
    agentBuilder.skill.registerSkill(PLATFORM_PRIVILEGES_SKILL),
  ]);
};
