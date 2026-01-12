/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '../../../../common/types/domain';
import type { AttachmentUI } from '../../../containers/types';
import type { CaseUI, AlertAttachmentUI, EventAttachmentUI } from '../../../../common/ui/types';

export const getManualAlertIds = (comments: AttachmentUI[]): string[] => {
  const dedupeAlerts = comments.reduce((alertIds, comment: AttachmentUI) => {
    if (comment.type === AttachmentType.alert) {
      const ids = Array.isArray(comment.alertId) ? comment.alertId : [comment.alertId];
      ids.forEach((id) => alertIds.add(id));
      return alertIds;
    }
    return alertIds;
  }, new Set<string>());
  return Array.from(dedupeAlerts);
};

const isAlertAttachment = (comment: AttachmentUI): comment is AlertAttachmentUI => {
  return comment.type === AttachmentType.alert;
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

const isEventAttachment = (comment: AttachmentUI): comment is EventAttachmentUI => {
  return comment.type === AttachmentType.event;
};

const filterEventCommentByIds = (
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
        if (isEventAttachment(comment)) {
          return filterEventCommentByIds(comment, searchTerm);
        }
        return comment;
      })
      .filter((comment): comment is AttachmentUI => comment !== null),
  };
};
