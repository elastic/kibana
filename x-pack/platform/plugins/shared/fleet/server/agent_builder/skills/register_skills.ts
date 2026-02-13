/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OnechatPluginSetup } from '@kbn/agent-builder-plugin/server';
import { FLEET_AGENTS_SKILL } from './fleet_agents_skill';
import { FLEET_INTEGRATIONS_SKILL } from './fleet_integrations_skill';

export const registerAgentBuilderSkills = async (onechat: OnechatPluginSetup): Promise<void> => {
  await Promise.all([
    onechat.skill.registerSkill(FLEET_AGENTS_SKILL),
    onechat.skill.registerSkill(FLEET_INTEGRATIONS_SKILL),
  ]);
};



