/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { ConversationClient } from '../services/conversation';
import { conversationStepRegistry } from './registry';
import { conversationMetadataUpdatedTriggerCommonDefinition } from '../../common/workflows/triggers';

export function registerConversationWorkflowSteps(
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup,
  getConversationClient: (request: KibanaRequest) => Promise<ConversationClient>,
  isExperimentalEnabled: (request: KibanaRequest) => Promise<boolean>
) {
  workflowsExtensions.registerTriggerDefinition(conversationMetadataUpdatedTriggerCommonDefinition);

  for (const factory of conversationStepRegistry) {
    workflowsExtensions.registerStepDefinition(
      factory(getConversationClient, isExperimentalEnabled)
    );
  }
}
