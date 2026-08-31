/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { ServiceManager } from '../services';
import { getRunAgentStepDefinition } from './run_agent_step';
import { rerankStepDefinition } from './rerank_step';
import { getConversationGetStepDefinition } from './conversation_get';
import { getConversationListStepDefinition } from './conversation_list';
import { getConversationCreateStepDefinition } from './conversation_create';
import { getConversationUpdateStepDefinition } from './conversation_update';
import { getConversationDeleteStepDefinition } from './conversation_delete';

export { getRunAgentStepDefinition, rerankStepDefinition };

/**
 * Registers the conversation management steps, which all operate on the request-scoped
 * conversation client resolved at execution time from the service manager.
 */
export const registerConversationStepDefinitions = (
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup,
  serviceManager: ServiceManager
): void => {
  workflowsExtensions.registerStepDefinition(getConversationGetStepDefinition(serviceManager));
  workflowsExtensions.registerStepDefinition(getConversationListStepDefinition(serviceManager));
  workflowsExtensions.registerStepDefinition(getConversationCreateStepDefinition(serviceManager));
  workflowsExtensions.registerStepDefinition(getConversationUpdateStepDefinition(serviceManager));
  workflowsExtensions.registerStepDefinition(getConversationDeleteStepDefinition(serviceManager));
};
