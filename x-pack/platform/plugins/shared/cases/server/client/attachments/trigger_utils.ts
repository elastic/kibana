/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentAttributesV2, Case, CaseAccess } from '../../../common/types/domain';
import type { Owner } from '../../../common/constants/types';
import {
  getAlertInfoFromComments,
  getEventInfoFromComments,
  isCaseRestricted,
} from '../../common/utils';
import type { AlertInfo } from '../../common/types';
import type { CasesClientArgs } from '..';

export function emitAttachmentsAddedEvent(
  clientArgs: CasesClientArgs,
  updatedCase: Case,
  attachmentIds: string[],
  attachmentType: string
): void {
  // workflow triggers never fire for restricted cases — the event payload
  // and the workflow run would reveal the case to non-assignees
  if (isCaseRestricted(updatedCase)) {
    return;
  }

  clientArgs.casesEventBus?.emitAttachmentsAdded(clientArgs.request, {
    caseId: updatedCase.id,
    attachmentIds,
    attachmentType,
    owner: updatedCase.owner as Owner,
  });
}

interface DeletedAttachment {
  id: string;
  attributes: AttachmentAttributesV2;
}

const toIdsAndIndices = (infos: AlertInfo[]) => ({
  ids: infos.map(({ id }) => id),
  indices: infos.map(({ index }) => index),
});

/**
 * Emits one attachmentsDeleted event per attachment type, including the referenced alert/event IDs.
 * Suppressed entirely for restricted cases.
 */
export function emitAttachmentsDeletedEvents(
  clientArgs: CasesClientArgs,
  theCase: { id: string; access?: CaseAccess | null },
  attachments: DeletedAttachment[]
): void {
  if (isCaseRestricted(theCase)) {
    return;
  }

  const caseId = theCase.id;
  const attachmentsByType = new Map<string, DeletedAttachment[]>();
  for (const attachment of attachments) {
    const { type } = attachment.attributes;
    const attachmentsOfType = attachmentsByType.get(type) ?? [];
    attachmentsOfType.push(attachment);
    attachmentsByType.set(type, attachmentsOfType);
  }

  for (const [attachmentType, attachmentsOfType] of attachmentsByType) {
    const attributes = attachmentsOfType.map((attachment) => attachment.attributes);
    const alerts = toIdsAndIndices(getAlertInfoFromComments(attributes));
    const events = toIdsAndIndices(getEventInfoFromComments(attributes));

    clientArgs.casesEventBus?.emitAttachmentsDeleted(clientArgs.request, {
      caseId,
      attachmentIds: attachmentsOfType.map(({ id }) => id),
      attachmentType,
      owner: attributes[0].owner as Owner,
      ...(alerts.ids.length > 0 ? { alertIds: alerts.ids, alertIndices: alerts.indices } : {}),
      ...(events.ids.length > 0 ? { eventIds: events.ids, eventIndices: events.indices } : {}),
    });
  }
}
