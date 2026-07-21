/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnifiedReferenceAttachmentPayload } from '../../../../common/types/domain';
import { AttachmentType } from '../../../../common/types/domain';
import type { AttachmentUI } from '../../../containers/types';
import type {
  CaseUI,
  AlertAttachmentUI,
  EventAttachmentUI,
  AttachmentUIV2,
} from '../../../../common/ui/types';
import {
  isLegacyEventAttachment,
  isUnifiedReferenceAttachmentRequest,
} from '../../../../common/utils/attachments';
import { isSavedObjectAttachment } from '../../attachments/common/saved_object/helpers';
import { LENS_ATTACHMENT_TYPE } from '../../../../common/constants/attachments';
import { FILE_ATTACHMENT_TYPE } from '../../../../common/constants';
import { resolveUnifiedAttachmentType } from '../../../../common/utils/attachments/migration_utils';
import { UNKNOWN } from '../../../common/translations';

/**
 * Stable identifier for an attachment author. Prefers `profileUid`, then
 * `username`, then `email`. Returns the empty string when none are set.
 */
export const getAttachmentAuthorKey = (user: AttachmentUIV2['createdBy']): string =>
  user.profileUid ?? user.username ?? user.email ?? '';

/**
 * Display label for an attachment author. Prefers `fullName`, then `username`,
 * then `email`, falling back to a localized "Unknown" placeholder.
 */
export const getAttachmentAuthorLabel = (user: AttachmentUIV2['createdBy']): string =>
  user.fullName || user.username || user.email || UNKNOWN;

export const getAttachmentItemCount = (comment: AttachmentUIV2): number => {
  // Persistable (value) lens has no countable id and the attachments tab
  // renderer only handles the SO-reference arm, so exclude it from the count.
  // Explicit Lens carve-out for now; revisit when we generalize hybrid types.
  if (comment.type === LENS_ATTACHMENT_TYPE && !isSavedObjectAttachment(comment)) {
    return 0;
  }
  if (isAlertAttachment(comment)) {
    return Array.isArray(comment.alertId) ? comment.alertId.length : 1;
  }
  if (isLegacyEventAttachment(comment)) {
    return Array.isArray(comment.eventId) ? comment.eventId.length : 1;
  }
  if (isUnifiedReferenceAttachmentRequest(comment)) {
    return Array.isArray(comment.attachmentId) ? comment.attachmentId.length : 1;
  }
  return 1;
};

const isAlertAttachment = (comment: AttachmentUIV2): comment is AlertAttachmentUI => {
  return comment.type === AttachmentType.alert && `alertId` in comment;
};

const filterAlertCommentByIds = (
  comment: AlertAttachmentUI,
  searchTerm: string
): AlertAttachmentUI | null => {
  const term = searchTerm.toLowerCase();
  const ids = Array.isArray(comment.alertId) ? comment.alertId : [comment.alertId];
  const filteredIds = ids.filter((id: string) => Boolean(id) && id.toLowerCase().includes(term));
  if (filteredIds.length === 0) {
    return null;
  }
  return {
    ...comment,
    alertId: filteredIds,
  };
};

const filterLegacyEventCommentByIds = (
  comment: EventAttachmentUI,
  searchTerm: string
): EventAttachmentUI | null => {
  const term = searchTerm.toLowerCase();
  const ids = Array.isArray(comment.eventId) ? comment.eventId : [comment.eventId];
  const filteredIds = ids.filter((id: string) => Boolean(id) && id.toLowerCase().includes(term));
  if (filteredIds.length === 0) {
    return null;
  }
  return {
    ...comment,
    eventId: filteredIds,
  };
};

/**
 * Unified reference attachments (saved objects, timeline, etc.) filter on the
 * cached `metadata.title` and `attachmentId`, case-insensitively — matching
 * the experience the user gets when typing into each tab's search.
 */
const filterUnifiedAttachment = (
  comment: UnifiedReferenceAttachmentPayload,
  searchTerm: string
): UnifiedReferenceAttachmentPayload | null => {
  const term = searchTerm.toLowerCase();
  const title =
    typeof comment.metadata?.title === 'string' ? comment.metadata.title.toLowerCase() : '';
  if (title.includes(term)) {
    return comment;
  }

  if (Array.isArray(comment.attachmentId)) {
    const matchingIds = comment.attachmentId.filter((id) => id.toLowerCase().includes(term));
    if (matchingIds.length === 0) {
      return null;
    }
    return { ...comment, attachmentId: matchingIds };
  }

  if (!comment.attachmentId.toLowerCase().includes(term)) {
    return null;
  }
  return comment;
};

export const filterCaseAttachmentsBySearchTerm = (caseData: CaseUI, searchTerm: string): CaseUI => {
  if (!searchTerm) {
    return caseData;
  }

  const owner = Array.isArray(caseData.owner) ? caseData.owner[0] : caseData.owner;

  return {
    ...caseData,
    comments: caseData.comments
      .map((comment) => {
        if (isAlertAttachment(comment)) {
          return filterAlertCommentByIds(comment, searchTerm);
        }
        if (isLegacyEventAttachment(comment)) {
          return filterLegacyEventCommentByIds(comment, searchTerm);
        }
        // Files are searched server-side by filename (see `CaseViewFiles` /
        // `useGetCaseFileStats`); their comment metadata carries no searchable
        // title, so keep them here and let the files API drive the results.
        if (resolveUnifiedAttachmentType(comment, owner) === FILE_ATTACHMENT_TYPE) {
          return comment;
        }
        if (isUnifiedReferenceAttachmentRequest(comment)) {
          return filterUnifiedAttachment(comment, searchTerm);
        }
        return comment;
      })
      .filter((comment): comment is AttachmentUI => comment !== null),
  };
};
