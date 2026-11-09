/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseUI, UserActionUI } from '../../../containers/types';
import { LINKED_INVESTIGATION_ATTACHMENT_TYPE } from '../../../../common/constants/attachments';

const OPENING_WINDOW_MS = 60_000;

export interface AlertZeroOpening {
  /** The create_case user action that stands for the whole opening. */
  createUserActionId: string;
  /** How many investigation links the opening absorbs. */
  linkedCount: number;
  /** The link user actions that render as part of the opening instead of on their own. */
  mergedUserActionIds: Set<string>;
}

const getAttachmentType = (userAction: UserActionUI): string | undefined => {
  const comment = (userAction.payload as { comment?: { type?: unknown } }).comment;
  return typeof comment?.type === 'string' ? comment.type : undefined;
};

const sameAuthor = (a: UserActionUI['createdBy'], b: UserActionUI['createdBy']) =>
  (a.profileUid != null && a.profileUid === b.profileUid) ||
  (a.username != null && a.username === b.username);

/**
 * Opening a case from AlertZero writes the case and then one link per investigation. On an
 * AlertZero case those links, when made by the case's author within a minute of creating it,
 * read as one event. Links made later keep their own rows.
 */
export const getAlertZeroOpening = (
  userActions: UserActionUI[],
  caseData: Pick<CaseUI, 'source'>
): AlertZeroOpening | undefined => {
  if (caseData.source !== 'alertzero') {
    return undefined;
  }

  const createAction = userActions.find((userAction) => userAction.type === 'create_case');
  if (!createAction) {
    return undefined;
  }

  const createdAt = Date.parse(createAction.createdAt);
  const mergedUserActionIds = new Set<string>();
  for (const userAction of userActions) {
    if (
      userAction.type === 'comment' &&
      userAction.action === 'create' &&
      getAttachmentType(userAction) === LINKED_INVESTIGATION_ATTACHMENT_TYPE &&
      sameAuthor(userAction.createdBy, createAction.createdBy) &&
      Date.parse(userAction.createdAt) - createdAt <= OPENING_WINDOW_MS
    ) {
      mergedUserActionIds.add(userAction.id);
    }
  }

  if (mergedUserActionIds.size === 0) {
    return undefined;
  }

  return {
    createUserActionId: createAction.id,
    linkedCount: mergedUserActionIds.size,
    mergedUserActionIds,
  };
};
