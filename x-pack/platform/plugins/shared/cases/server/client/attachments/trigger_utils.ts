/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ATTACHMENTS_ADDED_EVENT_TYPE,
  COMMENTS_ADDED_EVENT_TYPE,
} from '@kbn/domain-events/events/cases';
import type { Case } from '../../../common/types/domain';
import type { Owner } from '../../../common/constants/types';
import type { CasesClientArgs } from '..';

export function emitAttachmentsAddedEvent(
  clientArgs: CasesClientArgs,
  updatedCase: Case,
  attachmentIds: string[],
  attachmentType: string
): void {
  // We want comment attachments to always be used with the `comment` type,
  // even for legacy `user` types
  const enhancedAttachmentType = attachmentType === 'user' ? 'comment' : attachmentType;

  clientArgs.domainEvents.publish({
    type: ATTACHMENTS_ADDED_EVENT_TYPE,
    payload: {
      caseId: updatedCase.id,
      attachmentIds,
      attachmentType: enhancedAttachmentType,
      owner: updatedCase.owner as Owner,
    },
    request: clientArgs.request,
  });

  // if it's comments, also emit the comments added trigger
  if (enhancedAttachmentType === 'comment') {
    clientArgs.domainEvents.publish({
      type: COMMENTS_ADDED_EVENT_TYPE,
      payload: {
        caseId: updatedCase.id,
        owner: updatedCase.owner as Owner,
        commentIds: attachmentIds,
      },
      request: clientArgs.request,
    });
  }
}
