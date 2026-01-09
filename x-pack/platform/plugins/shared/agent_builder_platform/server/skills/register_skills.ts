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
import { PLATFORM_PRIVILEGES_SKILL } from './platform_privileges_skill';
import { PLATFORM_SAVED_OBJECTS_SKILL } from './platform_saved_objects_skill';
import { PLATFORM_SEARCH_SKILL } from './platform_search_skill';
import { PLATFORM_SPACES_SKILL } from './platform_spaces_skill';
import { PLATFORM_TAGS_SKILL } from './platform_tags_skill';
import { PLATFORM_UI_SETTINGS_SKILL } from './platform_ui_settings_skill';
import { PLATFORM_VISUALIZATION_SKILL } from './platform_visualization_skill';
import { PLATFORM_WORKFLOWS_LOGS_SKILL } from './platform_workflows_logs_skill';
import { PLATFORM_WORKFLOWS_SKILL } from './platform_workflows_skill';

export const registerSkills = (setupDeps: PluginSetupDependencies) => {
  setupDeps.onechat.skills.register(PLATFORM_SEARCH_SKILL);
  setupDeps.onechat.skills.register(PLATFORM_VISUALIZATION_SKILL);
  setupDeps.onechat.skills.register(PLATFORM_SAVED_OBJECTS_SKILL);
  setupDeps.onechat.skills.register(PLATFORM_DATA_VIEWS_SKILL);
  setupDeps.onechat.skills.register(PLATFORM_ALERTING_RULES_SKILL);
  setupDeps.onechat.skills.register(PLATFORM_CONNECTORS_ACTIONS_SKILL);
  setupDeps.onechat.skills.register(PLATFORM_WORKFLOWS_SKILL);
  setupDeps.onechat.skills.register(PLATFORM_WORKFLOWS_LOGS_SKILL);
  setupDeps.onechat.skills.register(PLATFORM_CASES_SKILL);
  setupDeps.onechat.skills.register(PLATFORM_SPACES_SKILL);
  setupDeps.onechat.skills.register(PLATFORM_TAGS_SKILL);
  setupDeps.onechat.skills.register(PLATFORM_UI_SETTINGS_SKILL);
  setupDeps.onechat.skills.register(PLATFORM_PRIVILEGES_SKILL);
};



