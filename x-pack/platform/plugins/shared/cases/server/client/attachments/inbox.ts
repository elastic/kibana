/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KueryNode } from '@kbn/es-query';
import { fromKueryExpression, nodeBuilder } from '@kbn/es-query';

import {
  CASE_ATTACHMENT_SAVED_OBJECT,
  CASE_USER_ACTION_SAVED_OBJECT,
  MAX_INBOX_ITEMS,
} from '../../../common/constants';
import type { User } from '../../../common/types/domain';
import type { InboxFindResponse, InboxItem, InboxReason } from '../../../common/types/api/inbox/v1';
import { Operations } from '../../authorization';
import { createCaseError, isSOError } from '../../common/error';
import { getCaseReferenceId } from '../../common/references';
import type { CasesClientArgs } from '../types';
import { buildFilter, combineFilters } from '../utils';
import { findAttachments, getCommentContent } from './threads';

const ATTRIBUTES = `${CASE_ATTACHMENT_SAVED_OBJECT}.attributes`;
const MAX_REPLIES_FOR_INBOX = 200;

interface InboxEntry {
  id: string;
  caseId?: string;
  owner: string;
  commentId?: string;
  threadId?: string;
  content?: string;
  createdAt: string;
  createdBy: User;
  reason: InboxReason;
}

interface InboxQuery {
  uid: string;
  owners: string[];
}

const buildOwnerFilter = (owners: string[], type: string): KueryNode | undefined =>
  buildFilter({ filters: owners, field: 'owner', operator: 'or', type });

const findMentionEntries = async (
  { uid, owners }: InboxQuery,
  clientArgs: CasesClientArgs
): Promise<InboxEntry[]> => {
  const mentioned = await findAttachments(
    {
      filter: combineFilters([
        nodeBuilder.is(`${ATTRIBUTES}.mentions`, uid),
        buildOwnerFilter(owners, CASE_ATTACHMENT_SAVED_OBJECT),
      ]),
      sortOrder: 'desc',
      perPage: MAX_INBOX_ITEMS,
    },
    clientArgs
  );

  return mentioned.map(({ attachment, caseId }) => ({
    id: attachment.id,
    caseId,
    owner: attachment.owner,
    commentId: attachment.parent_id ?? attachment.id,
    ...(attachment.parent_id != null ? { threadId: attachment.parent_id } : {}),
    content: getCommentContent(attachment),
    createdAt: attachment.created_at,
    createdBy: attachment.created_by,
    reason: 'mention',
  }));
};

/** Replies by others to the user's comments; parents are fetched as their author isn't mapped. */
const findReplyEntries = async (
  { uid, owners }: InboxQuery,
  clientArgs: CasesClientArgs
): Promise<InboxEntry[]> => {
  const replies = await findAttachments(
    {
      filter: combineFilters([
        fromKueryExpression(`${ATTRIBUTES}.parent_id: *`),
        buildOwnerFilter(owners, CASE_ATTACHMENT_SAVED_OBJECT),
      ]),
      sortOrder: 'desc',
      perPage: MAX_REPLIES_FOR_INBOX,
    },
    clientArgs
  );

  const othersReplies = replies.filter(
    ({ attachment }) => attachment.created_by.profile_uid !== uid
  );
  const parentIds = [
    ...new Set(othersReplies.flatMap(({ attachment }) => attachment.parent_id ?? [])),
  ];

  if (parentIds.length === 0) {
    return [];
  }

  const parents = await clientArgs.services.attachmentService.getter.bulkGet(parentIds);
  const myParentIds = new Set(
    parents.saved_objects.flatMap((parent) =>
      parent.error == null && parent.attributes?.created_by?.profile_uid === uid ? [parent.id] : []
    )
  );

  return othersReplies.flatMap(({ attachment, caseId }): InboxEntry[] =>
    attachment.parent_id != null && myParentIds.has(attachment.parent_id)
      ? [
          {
            id: attachment.id,
            caseId,
            owner: attachment.owner,
            commentId: attachment.parent_id,
            threadId: attachment.parent_id,
            content: getCommentContent(attachment),
            createdAt: attachment.created_at,
            createdBy: attachment.created_by,
            reason: 'reply',
          },
        ]
      : []
  );
};

const findAssignmentEntries = async (
  { uid, owners }: InboxQuery,
  { authorization, services: { userActionService } }: CasesClientArgs
): Promise<InboxEntry[]> => {
  const { filter, ensureSavedObjectsAreAuthorized } = await authorization.getAuthorizationFilter(
    Operations.findUserActions
  );

  const assignments = await userActionService.finder.findAssignments({
    uid,
    filter: combineFilters([filter, buildOwnerFilter(owners, CASE_USER_ACTION_SAVED_OBJECT)]),
    perPage: MAX_INBOX_ITEMS,
  });

  ensureSavedObjectsAreAuthorized(
    assignments.map(({ id, attributes: { owner } }) => ({ id, owner }))
  );

  return assignments.map(({ id, references, attributes }) => ({
    id,
    caseId: getCaseReferenceId(references),
    owner: attributes.owner,
    createdAt: attributes.created_at,
    createdBy: attributes.created_by,
    reason: 'assignment',
  }));
};

/**
 * Mentions, replies and case assignments of the current user, newest first.
 * Skips the user's own actions; read state lives in the user profile.
 */
export const findInbox = async (
  { owners }: { owners: string[] },
  clientArgs: CasesClientArgs
): Promise<InboxFindResponse> => {
  const {
    user,
    logger,
    services: { caseService },
  } = clientArgs;
  const uid = user.profile_uid;

  if (uid == null) {
    return { items: [] };
  }

  try {
    // A reply that also mentions the user is listed once, as a mention.
    const query = { uid, owners };
    const entries = (
      await Promise.all([
        findReplyEntries(query, clientArgs),
        findMentionEntries(query, clientArgs),
        findAssignmentEntries(query, clientArgs),
      ])
    ).flat();

    const sorted = [
      ...new Map(
        entries
          .filter(({ createdBy }) => createdBy.profile_uid !== uid)
          .map((entry) => [entry.id, entry])
      ).values(),
    ]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, MAX_INBOX_ITEMS);

    const caseIds = [...new Set(sorted.flatMap(({ caseId }) => caseId ?? []))];
    const cases = caseIds.length > 0 ? await caseService.getCases({ caseIds }) : null;
    const titleByCaseId = new Map(
      (cases?.saved_objects ?? []).flatMap(
        (theCase): Array<[string, string]> =>
          isSOError(theCase) ? [] : [[theCase.id, theCase.attributes.title]]
      )
    );

    const items = sorted.flatMap(({ caseId, ...entry }): InboxItem[] => {
      const caseTitle = caseId != null ? titleByCaseId.get(caseId) : undefined;
      return caseId != null && caseTitle != null ? [{ ...entry, caseId, caseTitle }] : [];
    });

    return { items };
  } catch (error) {
    throw createCaseError({
      message: `Failed to find the inbox of the current user: ${error}`,
      error,
      logger,
    });
  }
};
