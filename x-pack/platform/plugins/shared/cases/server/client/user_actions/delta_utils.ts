/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseDeltaCounts, CaseDeltaItem, DeltaCategory } from '../../../common/types/api';
import { DeltaCategories, MAX_DELTA_ITEMS } from '../../../common/types/api';
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
  readonly id: string;
  readonly created_at: string;
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

const readString = (value: unknown, ...path: string[]): string | null => {
  const found = path.reduce<unknown>(
    (current, key) =>
      typeof current === 'object' && current !== null && key in current
        ? (current as Record<string, unknown>)[key]
        : undefined,
    value
  );
  return typeof found === 'string' ? found : null;
};

const readFirstFileName = (payload: unknown): string | null => {
  const files = (payload as { comment?: { externalReferenceMetadata?: { files?: unknown } } })
    ?.comment?.externalReferenceMetadata?.files;
  return Array.isArray(files) ? readString(files[0], 'name') : null;
};

const detailReaders: Record<string, (payload: unknown) => string | null> = {
  [UserActionTypes.status]: (payload) => readString(payload, 'status'),
  [UserActionTypes.severity]: (payload) => readString(payload, 'severity'),
  [UserActionTypes.observables]: (payload) => readString(payload, 'observables', 'actionType'),
  [UserActionTypes.comment]: (payload) =>
    readString(payload, 'comment', 'rule', 'name') ?? readFirstFileName(payload),
};

const readObservableCount = (payload: unknown): number => {
  const count = (payload as { observables?: { count?: unknown } })?.observables?.count;
  return typeof count === 'number' ? count : 1;
};

const toDeltaItem = (userAction: DeltaUserAction): CaseDeltaItem => ({
  id: userAction.id,
  category: categorizeUserAction(userAction),
  type: userAction.type,
  action: userAction.action,
  createdAt: userAction.created_at,
  author: userAction.created_by.full_name ?? userAction.created_by.username ?? null,
  detail: detailReaders[userAction.type]?.(userAction.payload) ?? null,
  count:
    userAction.type === UserActionTypes.observables ? readObservableCount(userAction.payload) : 1,
});

export const summarizeDelta = (
  userActions: readonly DeltaUserAction[],
  currentUser: User
): { counts: CaseDeltaCounts; items: CaseDeltaItem[] } => {
  const relevant = userActions.filter(
    (userAction) =>
      userAction.type !== UserActionTypes.create_case &&
      !isSameUser(userAction.created_by, currentUser)
  );

  const counts: CaseDeltaCounts = { alerts: 0, comments: 0, changes: 0, evidence: 0 };
  for (const userAction of relevant) {
    counts[categorizeUserAction(userAction)] += 1;
  }

  const items = relevant
    .toSorted((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, MAX_DELTA_ITEMS)
    .map(toDeltaItem);

  return { counts, items };
};
