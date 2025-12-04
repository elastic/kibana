/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/server';

export type { AgentSkillsPluginSetup, AgentSkillsPluginStart } from './plugin';

// Re-export from the shared package
export { Skill } from '@kbn/agent-skills-common';

export async function plugin(initializerContext: PluginInitializerContext) {
  const { AgentSkillsPlugin } = await import('./plugin');
  return new AgentSkillsPlugin(initializerContext);
}
