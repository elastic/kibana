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
  isUnifiedEventAttachment,
} from '../../../../common/utils/attachments';

export const getManualAlertIds = (comments: AttachmentUIV2[]): string[] => {
  const dedupeAlerts = comments.reduce((alertIds, comment: AttachmentUIV2) => {
    if (comment.type === AttachmentType.alert && `alertId` in comment) {
      const ids = Array.isArray(comment.alertId) ? comment.alertId : [comment.alertId];
      ids.forEach((id) => alertIds.add(id));
      return alertIds;
    }
    return alertIds;
  }, new Set<string>());
  return Array.from(dedupeAlerts);
};

const isAlertAttachment = (comment: AttachmentUIV2): comment is AlertAttachmentUI => {
  return comment.type === AttachmentType.alert && `alertId` in comment;
};

const filterAlertCommentByIds = (
  comment: AlertAttachmentUI,
  searchTerm: string
): AlertAttachmentUI | null => {
  const ids = Array.isArray(comment.alertId) ? comment.alertId : [comment.alertId];
  const filteredIds = ids.filter((id: string) => Boolean(id) && id.includes(searchTerm));
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
  const ids = Array.isArray(comment.eventId) ? comment.eventId : [comment.eventId];
  const filteredIds = ids.filter((id: string) => Boolean(id) && id.includes(searchTerm));
  if (filteredIds.length === 0) {
    return null;
  }
  return {
    ...comment,
    eventId: filteredIds,
  };
};

const filterUnifiedCommentById = (
  comment: UnifiedReferenceAttachmentPayload,
  searchTerm: string
): UnifiedReferenceAttachmentPayload | null => {
  if (Array.isArray(comment.attachmentId)) {
    const matchingIds = comment.attachmentId.filter((id) => id.includes(searchTerm));
    if (matchingIds.length === 0) {
      return null;
    }
    return { ...comment, attachmentId: matchingIds };
  }
  if (!comment.attachmentId.includes(searchTerm)) {
    return null;
  }
  return comment;
};

export const filterCaseAttachmentsBySearchTerm = (caseData: CaseUI, searchTerm: string): CaseUI => {
  if (!searchTerm) {
    return caseData;
  }

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
        if (isUnifiedEventAttachment(comment)) {
          return filterUnifiedCommentById(comment, searchTerm);
        }
        return comment;
      })
      .filter((comment): comment is AttachmentUI => comment !== null),
  };
};
