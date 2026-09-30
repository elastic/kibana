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
import { toAttachmentTriggerEvent } from './attachment_trigger_mapping';

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

  // Resolves the flag and the client once, then emits each trigger independently so one
  // failing emit does not drop the rest of the batch.
  const forwardBatch = async (
    request: KibanaRequest,
    triggers: Array<{ triggerId: string; payload: unknown }>
  ) => {
    let client: Awaited<ReturnType<typeof workflowsExtensions.getClient>>;
    try {
      if (!(await isExperimentalEnabled(request))) {
        return;
      }
      client = await workflowsExtensions.getClient(request);
    } catch (error) {
      logger.warn(`Failed to resolve workflows client for attachment triggers: ${error}`);
      return;
    }
    for (const { triggerId, payload } of triggers) {
      try {
        await client.emitEvent(triggerId, payload as Record<string, unknown>);
      } catch (error) {
        logger.warn(`Failed to emit workflow trigger "${triggerId}": ${error}`);
      }
    }
  };

  conversationEventBus.onMetadataPatched((request, payload) => {
    void forward(ConversationMetadataUpdatedTriggerId, payload, request);
  });

  conversationEventBus.onAttachmentEvents((request, { conversationId, events }) => {
    void forwardBatch(
      request,
      events.map((event) => toAttachmentTriggerEvent(conversationId, event))
    );
  });
}
