/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import {
  createWorkflowTriggerForwarder,
  type WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';
import type { CasesEventBus } from '../../events/event_bus';
import {
  CaseCreatedTriggerId,
  CaseUpdatedTriggerId,
  AttachmentsAddedTriggerId,
  CommentsAddedTriggerId,
  CaseStatusUpdatedTriggerId,
  ExtendedFieldsUpdatedTriggerId,
  ObservablesAddedTriggerId,
} from '../../../common/workflows/triggers';
import { buildExtendedFieldsUpdatedPayload } from './extended_fields_updated_payload';

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

  const forward = createWorkflowTriggerForwarder(workflowsExtensions, logger);

  casesEventBus.onCaseCreated((event) => {
    void forward(CaseCreatedTriggerId, event.payload, event.request);
  });

  casesEventBus.onCaseUpdated((event, { previousCase, updatedCase }) => {
    void forward(CaseUpdatedTriggerId, event.payload, event.request);

    const { updatedFields, ...reducedPayload } = event.payload;
    if (updatedFields && previousCase && updatedCase && updatedFields.includes('status')) {
      const status = updatedCase.status;
      const previousStatus = previousCase.attributes.status;

      if (status && previousStatus && status !== previousStatus) {
        void forward(
          CaseStatusUpdatedTriggerId,
          { ...reducedPayload, status, previousStatus },
          event.request
        );
      }
    }

    // Do NOT gate this on `updatedFields.includes('extended_fields')`. A patch to `customFields`
    // on a field linked to a global field definition mirrors into `extended_fields` server-side,
    // but `updatedFields` only contains `['customFields']` in that case (computed before the
    // adapter runs). Derive from a value diff instead.
    if (previousCase && updatedCase) {
      const extendedFieldsPayload = buildExtendedFieldsUpdatedPayload({
        ...reducedPayload,
        previousExtendedFields: previousCase.attributes.extended_fields,
        extendedFields: updatedCase.extended_fields,
      });

      if (extendedFieldsPayload) {
        void forward(ExtendedFieldsUpdatedTriggerId, extendedFieldsPayload, event.request);
      }
    }
  });

  casesEventBus.onObservablesAdded((event) => {
    void forward(ObservablesAddedTriggerId, event.payload, event.request);
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

    // if it's comments, also emit the comments added trigger
    if (enhancedAttachmentType === 'comment') {
      const { attachmentType, attachmentIds, ...payload } = event.payload;
      void forward(
        CommentsAddedTriggerId,
        {
          ...payload,
          commentIds: attachmentIds,
        },
        event.request
      );
    }
  });
}
