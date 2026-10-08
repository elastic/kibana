/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { ConversationPublicClient } from '@kbn/agent-builder-server';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import { getAppendWorkflowExecutionIdStepDefinition } from './append_workflow_execution_id_step';

/** Registers the workflow execution step during plugin setup. */
export const registerWorkflowExecutionStepDefinitions = ({
  workflowsExtensions,
  getConversationClient,
}: {
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  getConversationClient: (request: KibanaRequest) => Promise<ConversationPublicClient>;
}): void => {
  workflowsExtensions.registerStepDefinition(
    getAppendWorkflowExecutionIdStepDefinition({ getConversationClient })
  );
};
