/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import { ConversationMetadataUpdatedTriggerId } from '../../../common/workflows/triggers';
import type { ConversationEventBus } from './conversation_event_bus';

/**
 * Registers bridge listeners that forward conversation domain events to workflows_extensions.
 */
export function registerConversationWorkflowEventBridge(
  conversationEventBus: ConversationEventBus,
  workflowsExtensions: WorkflowsExtensionsServerPluginStart | undefined,
  logger: Logger,
  isExperimentalEnabled: (request: KibanaRequest) => Promise<boolean>
): void {
  if (!workflowsExtensions) {
    return;
  }

  const forward = async (eventType: string, payload: unknown, request: KibanaRequest) => {
    try {
      if (!(await isExperimentalEnabled(request))) {
        return;
      }
      const client = await workflowsExtensions.getClient(request);
      await client.emitEvent(eventType, payload as Record<string, unknown>);
    } catch (error) {
      logger.warn(`Failed to emit workflow trigger "${eventType}": ${error}`);
    }
  };

  conversationEventBus.onMetadataPatched((request, payload) => {
    void forward(ConversationMetadataUpdatedTriggerId, payload, request);
  });
}
