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
import type { CaseUpdateOrigin } from '../../events/types';

export function emitAttachmentsAddedEvent(
  clientArgs: CasesClientArgs,
  { id: caseId, owner, access }: Pick<Case, 'id' | 'owner'> & { access?: CaseAccess | null },
  ids: string[],
  attachmentType: string,
  origin?: CaseUpdateOrigin
): void {
  // Restricted cases emit too, flagged: the Workflows bridge drops them, because the event
  // payload and the workflow run would reveal the case to non-assignees.
  clientArgs.casesEventBus?.emitAttachmentsAdded(clientArgs.request, {
    caseId,
    ids,
    attachmentType,
    owner: owner as Owner,
    restricted: isCaseRestricted({ access }),
    ...(origin != null ? { origin } : {}),
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
  restricted?: boolean;
}

/**
 * Emits one attachmentsDeleted event, including the referenced alert/event IDs.
 */
export function emitAttachmentsDeletedEvent(
  clientArgs: CasesClientArgs,
  { caseId, owner, attachmentType, ids, removedAttributes, restricted }: AttachmentsDeletedEventArgs
): void {
  const alerts = toIdsAndIndices(getAlertInfoFromComments(removedAttributes));
  const events = toIdsAndIndices(getEventInfoFromComments(removedAttributes));

  clientArgs.casesEventBus?.emitAttachmentsDeleted(clientArgs.request, {
    caseId,
    ids,
    attachmentType,
    owner: owner as Owner,
    ...(restricted ? { restricted } : {}),
    ...(alerts.ids.length > 0 ? { alertIds: alerts.ids, alertIndices: alerts.indices } : {}),
    ...(events.ids.length > 0 ? { eventIds: events.ids, eventIndices: events.indices } : {}),
  });
}

/**
 * Emits one attachmentsDeleted event per attachment type, including the referenced alert/event IDs.
 * Restricted cases are flagged; the Workflows bridge drops them.
 */
export function emitAttachmentsDeletedEvents(
  clientArgs: CasesClientArgs,
  theCase: { id: string; access?: CaseAccess | null },
  attachments: DeletedAttachment[]
): void {
  const restricted = isCaseRestricted(theCase);

  const caseId = theCase.id;
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
      restricted,
    });
  }
}
