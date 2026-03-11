/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import type { CasesEventBus, CasesEventSource } from '../../events';
import {
  CaseCreatedTriggerId,
  CaseUpdatedTriggerId,
  CommentAddedTriggerId,
} from '../../../common/workflows/triggers';

/**
 * Registers bridge listeners that forward Cases domain events to workflows_extensions.
 * Skips forwarding when event source is 'workflowStep' to prevent recursion.
 */
export function registerCasesWorkflowEventBridge(
  casesEventBus: CasesEventBus,
  workflowsExtensions: WorkflowsExtensionsServerPluginStart | undefined,
  logger: Logger
): void {
  if (!workflowsExtensions) {
    return;
  }

  const forward = async (
    eventType: string,
    payload: Record<string, unknown>,
    metadata: { request: unknown; spaceId: string; source: CasesEventSource }
  ) => {
    if (metadata.source === 'workflowStep') {
      return;
    }

    try {
      await workflowsExtensions.emitEvent({
        triggerId: eventType,
        payload,
        request: metadata.request as Parameters<
          WorkflowsExtensionsServerPluginStart['emitEvent']
        >[0]['request'],
        spaceId: metadata.spaceId,
      });
    } catch (error) {
      logger.warn(`Failed to emit workflow trigger "${eventType}": ${error}`);
    }
  };

  casesEventBus.onCaseCreated((event) => {
    void forward(CaseCreatedTriggerId, event.payload, event.metadata);
  });

  casesEventBus.onCaseUpdated((event) => {
    void forward(CaseUpdatedTriggerId, event.payload, event.metadata);
  });

  casesEventBus.onCommentAdded((event) => {
    void forward(CommentAddedTriggerId, event.payload, event.metadata);
  });
}
