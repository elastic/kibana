/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import type { CasesEventBus } from '../../events/event_bus';
import {
  CaseCreatedTriggerId,
  CaseUpdatedTriggerId,
  AttachmentsAddedTriggerId,
} from '../../../common/workflows/triggers';

/**
 * Registers bridge listeners that forward Cases domain events to workflows_extensions.
 */
export function registerCasesWorkflowEventBridge(
  casesEventBus: CasesEventBus,
  workflowsExtensions: WorkflowsExtensionsServerPluginStart | undefined,
  logger: Logger
): void {
  if (!workflowsExtensions) {
    return;
  }

  const forward = async (eventType: string, payload: unknown, request: KibanaRequest) => {
    try {
      const client = await workflowsExtensions.getClient(request);
      await client.emitEvent(eventType, payload as Record<string, unknown>);
    } catch (error) {
      logger.warn(`Failed to emit workflow trigger "${eventType}": ${error}`);
    }
  };

  casesEventBus.onCaseCreated((event) => {
    void forward(CaseCreatedTriggerId, event.payload, event.request);
  });

  casesEventBus.onCaseUpdated((event) => {
    void forward(CaseUpdatedTriggerId, event.payload, event.request);
  });

  casesEventBus.onAttachmentsAdded((event) => {
    // We want comment attachments to always be used with the `comment` type,
    // even for legacy `user` types
    const enhancedAttachmentType =
      event.payload.attachmentType === 'user' ? 'comment' : event.payload.attachmentType;
    void forward(
      AttachmentsAddedTriggerId,
      {
        ...event.payload,
        attachmentType: enhancedAttachmentType,
      },
      event.request
    );
  });
}
