/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseDeltaCounts, DeltaCategory } from '../../../common/types/api';
import { DeltaCategories } from '../../../common/types/api';
import { UserActionActions, UserActionTypes } from '../../../common/types/domain';
import {
  FILE_ATTACHMENT_TYPE,
  LEGACY_ALERT_TYPE,
  LEGACY_FILE_ATTACHMENT_TYPE,
  OBSERVABILITY_ALERT_ATTACHMENT_TYPE,
  SECURITY_ALERT_ATTACHMENT_TYPE,
  STACK_ALERT_ATTACHMENT_TYPE,
} from '../../../common/constants/attachments';
import type { User } from '../../common/types/user';

export interface DeltaUserAction {
  readonly type: string;
  readonly action: string;
  readonly created_by: User;
  readonly payload?: unknown;
}

interface CommentPayload {
  readonly type?: string;
  readonly externalReferenceAttachmentTypeId?: string;
}

const getComment = (payload: unknown): CommentPayload => {
  if (typeof payload !== 'object' || payload === null || !('comment' in payload)) {
    return {};
  }
  const { comment } = payload;
  return typeof comment === 'object' && comment !== null ? comment : {};
};

const ALERT_COMMENT_TYPES: ReadonlySet<string> = new Set([
  LEGACY_ALERT_TYPE,
  SECURITY_ALERT_ATTACHMENT_TYPE,
  OBSERVABILITY_ALERT_ATTACHMENT_TYPE,
  STACK_ALERT_ATTACHMENT_TYPE,
]);

const FILE_ATTACHMENT_TYPE_IDS: ReadonlySet<string> = new Set([
  FILE_ATTACHMENT_TYPE,
  LEGACY_FILE_ATTACHMENT_TYPE,
]);

const isSameUser = (author: User, current: User): boolean =>
  author.profile_uid != null && current.profile_uid != null
    ? author.profile_uid === current.profile_uid
    : author.username != null && author.username === current.username;

const categorizeComment = (userAction: DeltaUserAction): DeltaCategory => {
  if (userAction.action !== UserActionActions.create) {
    return DeltaCategories.changes;
  }

  const { type, externalReferenceAttachmentTypeId } = getComment(userAction.payload);

  if (type != null && ALERT_COMMENT_TYPES.has(type)) {
    return DeltaCategories.alerts;
  }

  if (
    externalReferenceAttachmentTypeId != null &&
    FILE_ATTACHMENT_TYPE_IDS.has(externalReferenceAttachmentTypeId)
  ) {
    return DeltaCategories.evidence;
  }

  return DeltaCategories.comments;
};

export const categorizeUserAction = (userAction: DeltaUserAction): DeltaCategory => {
  if (userAction.type === UserActionTypes.comment) {
    return categorizeComment(userAction);
  }

  return userAction.type === UserActionTypes.observables
    ? DeltaCategories.evidence
    : DeltaCategories.changes;
};

export const countDelta = (
  userActions: readonly DeltaUserAction[],
  currentUser: User
): CaseDeltaCounts => {
  const counts: CaseDeltaCounts = { alerts: 0, comments: 0, changes: 0, evidence: 0 };

  for (const userAction of userActions) {
    const isCaseCreation = userAction.type === UserActionTypes.create_case;
    if (!isCaseCreation && !isSameUser(userAction.created_by, currentUser)) {
      counts[categorizeUserAction(userAction)] += 1;
    }
  }

  return counts;
};
