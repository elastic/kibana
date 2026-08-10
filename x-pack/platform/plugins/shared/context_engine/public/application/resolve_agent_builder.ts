/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { CoreSetup } from '@kbn/core/public';
import type { ContextEnginePluginStart, ContextEngineStartDependencies } from '../types';

export const resolveAgentBuilderStart = async (
  core: CoreSetup<ContextEngineStartDependencies, ContextEnginePluginStart>
): Promise<AgentBuilderPluginStart | undefined> => {
  try {
    const { agentBuilder } = await core.plugins.onStart<{ agentBuilder: AgentBuilderPluginStart }>(
      'agentBuilder'
    );
    return agentBuilder.found ? agentBuilder.contract : undefined;
  } catch {
    return undefined;
  }
};
