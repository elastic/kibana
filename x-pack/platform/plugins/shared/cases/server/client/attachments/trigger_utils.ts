/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentAttributesV2, Case } from '../../../common/types/domain';
import type { Owner } from '../../../common/constants/types';
import { getAlertInfoFromComments, getEventInfoFromComments } from '../../common/utils';
import type { AlertInfo } from '../../common/types';
import type { CasesClientArgs } from '..';

export function emitAttachmentsAddedEvent(
  clientArgs: CasesClientArgs,
  updatedCase: Case,
  ids: string[],
  attachmentType: string
): void {
  clientArgs.casesEventBus?.emitAttachmentsAdded(clientArgs.request, {
    caseId: updatedCase.id,
    ids,
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

interface AttachmentsDeletedEventArgs {
  caseId: string;
  owner: string;
  attachmentType: string;
  /** The deleted attachments. */
  ids: string[];
  /** The removed fields, read for the alert/event IDs; can include ids removed from kept attachments. */
  removedAttributes: AttachmentAttributesV2[];
}

/**
 * Emits one attachmentsDeleted event, including the referenced alert/event IDs.
 */
export function emitAttachmentsDeletedEvent(
  clientArgs: CasesClientArgs,
  { caseId, owner, attachmentType, ids, removedAttributes }: AttachmentsDeletedEventArgs
): void {
  const alerts = toIdsAndIndices(getAlertInfoFromComments(removedAttributes));
  const events = toIdsAndIndices(getEventInfoFromComments(removedAttributes));

  clientArgs.casesEventBus?.emitAttachmentsDeleted(clientArgs.request, {
    caseId,
    ids,
    attachmentType,
    owner: owner as Owner,
    ...(alerts.ids.length > 0 ? { alertIds: alerts.ids, alertIndices: alerts.indices } : {}),
    ...(events.ids.length > 0 ? { eventIds: events.ids, eventIndices: events.indices } : {}),
  });
}

/**
 * Emits one attachmentsDeleted event per attachment type, including the referenced alert/event IDs.
 */
export function emitAttachmentsDeletedEvents(
  clientArgs: CasesClientArgs,
  caseId: string,
  attachments: DeletedAttachment[]
): void {
  const attachmentsByType = new Map<string, DeletedAttachment[]>();
  for (const attachment of attachments) {
    const { type } = attachment.attributes;
    const attachmentsOfType = attachmentsByType.get(type) ?? [];
    attachmentsOfType.push(attachment);
    attachmentsByType.set(type, attachmentsOfType);
  }

  for (const [attachmentType, attachmentsOfType] of attachmentsByType) {
    const removedAttributes = attachmentsOfType.map((attachment) => attachment.attributes);

    emitAttachmentsDeletedEvent(clientArgs, {
      caseId,
      owner: removedAttributes[0].owner,
      attachmentType,
      ids: attachmentsOfType.map(({ id }) => id),
      removedAttributes,
    });
  }
}
