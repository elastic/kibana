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
  AttachmentsDeletedTriggerId,
  CommentsAddedTriggerId,
  CaseStatusUpdatedTriggerId,
  ExtendedFieldsUpdatedTriggerId,
  ObservablesAddedTriggerId,
} from '../../../common/workflows/triggers';
import { buildExtendedFieldsUpdatedPayload } from './extended_fields_updated_payload';

// We want comment attachments to always be used with the `comment` type,
// even for legacy `user` types
const normalizeAttachmentType = (attachmentType: string): string =>
  attachmentType === 'user' ? 'comment' : attachmentType;

// `attachmentIds` is a deprecated alias of `ids` that saved workflows may still read.
const withDeprecatedAttachmentIds = <Payload extends { ids: string[] }>(payload: Payload) => ({
  ...payload,
  attachmentIds: payload.ids,
});

/**
 * Registers bridge listeners that forward Cases domain events to workflows_extensions.
 */
/**
 * Restricted cases emit Cases events so in-process listeners (auto-push, linked investigations)
 * see them, but no restricted-case data may reach a workflow: the event payload and the run would
 * reveal the case to people who aren't its assignees. The in-process-only fields are stripped
 * from what is forwarded.
 */
const isRestrictedEvent = (payload: { restricted?: boolean }): boolean =>
  payload.restricted === true;

const toWorkflowPayload = <
  Payload extends { restricted?: boolean; closeLinkedInvestigations?: boolean }
>(
  payload: Payload
): Omit<Payload, 'restricted' | 'closeLinkedInvestigations'> => {
  const { restricted, closeLinkedInvestigations, ...rest } = payload;
  return rest;
};

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
    if (isRestrictedEvent(event.payload)) {
      return;
    }
    void forward(CaseCreatedTriggerId, toWorkflowPayload(event.payload), event.request);
  });

  casesEventBus.onCaseUpdated((event, { previousCase, updatedCase }) => {
    if (isRestrictedEvent(event.payload)) {
      return;
    }
    const workflowPayload = toWorkflowPayload(event.payload);
    void forward(CaseUpdatedTriggerId, workflowPayload, event.request);

    const { updatedFields, ...reducedPayload } = workflowPayload;
    if (
      updatedFields &&
      previousCase &&
      updatedCase &&
      (updatedFields.includes('status') || updatedFields.includes('status_key'))
    ) {
      const status = updatedCase.status;
      const previousStatus = previousCase.attributes.status;
      const statusKey = updatedCase.status_key ?? undefined;
      const previousStatusKey = previousCase.attributes.status_key ?? undefined;

      // A move between two statuses of the same category is still a status change to a workflow.
      if (
        status &&
        previousStatus &&
        (status !== previousStatus || statusKey !== previousStatusKey)
      ) {
        void forward(
          CaseStatusUpdatedTriggerId,
          {
            ...reducedPayload,
            status,
            previousStatus,
            statusKey,
            previousStatusKey,
            paused: updatedCase.paused_at != null,
          },
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
    if (isRestrictedEvent(event.payload)) {
      return;
    }
    void forward(ObservablesAddedTriggerId, toWorkflowPayload(event.payload), event.request);
  });

  casesEventBus.onAttachmentsAdded((event) => {
    if (isRestrictedEvent(event.payload)) {
      return;
    }
    const workflowPayload = toWorkflowPayload(event.payload);
    const enhancedAttachmentType = normalizeAttachmentType(workflowPayload.attachmentType);
    void forward(
      AttachmentsAddedTriggerId,
      withDeprecatedAttachmentIds({
        ...workflowPayload,
        attachmentType: enhancedAttachmentType,
      }),
      event.request
    );

    // if it's comments, also emit the comments added trigger
    if (enhancedAttachmentType === 'comment') {
      const { attachmentType, ids, ...payload } = workflowPayload;
      void forward(
        CommentsAddedTriggerId,
        {
          ...payload,
          commentIds: ids,
        },
        event.request
      );
    }
  });

  casesEventBus.onAttachmentsDeleted((event) => {
    if (isRestrictedEvent(event.payload)) {
      return;
    }
    void forward(
      AttachmentsDeletedTriggerId,
      withDeprecatedAttachmentIds({
        ...toWorkflowPayload(event.payload),
        attachmentType: normalizeAttachmentType(event.payload.attachmentType),
      }),
      event.request
    );
  });
}
