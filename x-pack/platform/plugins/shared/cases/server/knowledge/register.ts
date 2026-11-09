/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ContextEnginePluginSetup } from '@kbn/context-engine-plugin/server';
import { getAiIndexDest } from '@kbn/context-engine-plugin/common/ai_index_dest';
import {
  CASES_MANAGED_WORKFLOW_PLUGIN_ID,
  CASES_PUBLISH_OUTCOME_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import { CASES_OUTCOMES_AI_INDEX_ID } from '../../common/constants';

/**
 * Registers `cases-outcomes` as a managed AI index, so the context engine resolves it in every
 * space and agents read it through the context engine tools.
 */
export const registerCasesOutcomesAiIndex = (contextEngine: ContextEnginePluginSetup) => {
  contextEngine.registerAiIndex(CASES_OUTCOMES_AI_INDEX_ID, {
    description:
      'Closed-case outcomes: what analysts decided and why. One knowledge indicator per closed ' +
      'case with its close reason, AI and human verdicts, closing notes, rules, hosts, users, and ' +
      'observables. Restricted cases are never published; a reopened case is removed.',
    memory_enabled: false,
    dest: getAiIndexDest('index', CASES_OUTCOMES_AI_INDEX_ID),
    sources: [],
    automations: [{ type: 'workflow', value: CASES_PUBLISH_OUTCOME_WORKFLOW_ID }],
    traces: [],
  });
};

/** Installs the managed workflow that publishes outcomes; one global copy serves every space. */
export const installCasesManagedWorkflows = async ({
  workflowsExtensions,
  logger,
}: {
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
  logger: Logger;
}): Promise<void> => {
  try {
    const client = await workflowsExtensions.initManagedWorkflowsClient(
      CASES_MANAGED_WORKFLOW_PLUGIN_ID
    );
    await client.install(CASES_PUBLISH_OUTCOME_WORKFLOW_ID, { spaceId: GLOBAL_WORKFLOW_SPACE_ID });
    await client.ready();
  } catch (error) {
    logger.error(
      `Failed to install the managed workflow "${CASES_PUBLISH_OUTCOME_WORKFLOW_ID}"; closed cases won't publish their outcome: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};
