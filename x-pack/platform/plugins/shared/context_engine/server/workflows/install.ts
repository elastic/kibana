/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import { SIGNAL_GENERATOR_ESQL_TOOL_CALL_WORKFLOW_ID } from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import { ensureStateIndexExists } from './state_index';

const PLUGIN_ID = 'contextEngine';

export type ContextEngineManagedWorkflowsClient = PluginScopedManagedWorkflowsApi;

export const initContextEngineManagedWorkflowsClient = async (
  workflowsExtensions: WorkflowsExtensionsServerPluginStart
): Promise<ContextEngineManagedWorkflowsClient> => {
  return workflowsExtensions.initManagedWorkflowsClient(PLUGIN_ID);
};

export const installSignalGeneratorWorkflow = async ({
  managedWorkflowsClient,
}: {
  managedWorkflowsClient: ContextEngineManagedWorkflowsClient;
}): Promise<void> => {
  await managedWorkflowsClient.install(SIGNAL_GENERATOR_ESQL_TOOL_CALL_WORKFLOW_ID, {
    spaceId: GLOBAL_WORKFLOW_SPACE_ID,
  });
};

export const installSignalGeneratorWorkflowAndMarkReady = async ({
  workflowsExtensions,
  esClient,
  logger,
}: {
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<void> => {
  try {
    // Ensure state index exists for watermark storage
    await ensureStateIndexExists({ esClient, logger });

    const managedWorkflowsClient = await initContextEngineManagedWorkflowsClient(
      workflowsExtensions
    );
    await installSignalGeneratorWorkflow({ managedWorkflowsClient });
    await managedWorkflowsClient.ready();
    logger.info('Signal generator workflow installed successfully');
  } catch (error) {
    logger.warn('Failed to install the signal generator workflow', { error });
  }
};
