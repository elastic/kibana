/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import { ensureStateIndexExists } from './state_index';

const PLUGIN_ID = 'contextEngine';

export type ContextEngineManagedWorkflowsClient = PluginScopedManagedWorkflowsApi;

export const initContextEngineManagedWorkflowsClient = async (
  workflowsExtensions: WorkflowsExtensionsServerPluginStart
): Promise<ContextEngineManagedWorkflowsClient> => {
  return workflowsExtensions.initManagedWorkflowsClient(PLUGIN_ID);
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

    // Signal generator workflow is no longer auto-installed as managed.
    // Users can create their own editable workflow via the Workflows UI.
    const managedWorkflowsClient = await initContextEngineManagedWorkflowsClient(
      workflowsExtensions
    );
    await managedWorkflowsClient.ready();
    logger.info('Context Engine workflows ready (signal generator workflow available for user creation)');
  } catch (error) {
    logger.warn('Failed to initialize Context Engine workflows', { error });
  }
};
