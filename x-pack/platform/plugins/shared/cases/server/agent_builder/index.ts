/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';

import type { CasesServerStartDependencies } from '../types';
import { casesAnalyticsTool } from './tools';

/**
 * Registers all cases built-in Agent Builder tools.
 *
 * Called from the cases plugin setup() when both agentBuilder and
 * analytics.index.enabled are present.
 */
export const registerCasesAgentBuilderTools = (
  agentBuilder: AgentBuilderPluginSetup,
  core: CoreSetup<CasesServerStartDependencies>,
  logger: Logger
): void => {
  agentBuilder.tools.register(casesAnalyticsTool(core, logger));
};
