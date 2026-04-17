/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, KibanaRequest } from '@kbn/core/server';
import type { CasesClient } from '../client';
import type { AgentBuilderPluginSetupContract, CasesServerStartDependencies } from '../types';
import { casesStepRegistry } from '../workflows/registry';
import { createAgentToolFromCasesStep } from './utils/step_to_tool';
import { searchCasesTool } from './tools/search_cases';

/**
 * Registers all Cases agent builder tools:
 *
 * 1. `platform.core.cases` — rich read/search tool (get by ID, find by alert ID, search/filter)
 *    with URL enrichment and comment summaries.
 * 2. `platform.core.cases.*` — CRUD tools wrapping each active workflow step handler.
 *
 * Workflow-only config (e.g. `push-case`) is not exposed. Config fields that are
 * meaningful to an agent (e.g. `connector-id` for createCase) are promoted to the
 * tool's input schema per the registry entry's `agentToolConfigFields`.
 */
export function registerCasesAgentBuilderTools(
  agentBuilder: AgentBuilderPluginSetupContract,
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>,
  coreSetup: CoreSetup<CasesServerStartDependencies>
): void {
  // Rich read/search tool (moved from agent_builder_platform)
  agentBuilder.tools.register(searchCasesTool(coreSetup, getCasesClient));

  // CRUD tools derived from workflow step definitions
  for (const { toolId, factory, agentToolConfigFields } of casesStepRegistry) {
    const stepDef = factory(getCasesClient);
    agentBuilder.tools.register(
      createAgentToolFromCasesStep(toolId, stepDef, agentToolConfigFields)
    );
  }
}
