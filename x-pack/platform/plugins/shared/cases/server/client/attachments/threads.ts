/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { fromKueryExpression, nodeBuilder } from '@kbn/es-query';
import type { KueryNode } from '@kbn/es-query';

import {
  CASE_ATTACHMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  MAX_REPLIES_PER_THREAD,
} from '../../../common/constants';
import { COMMENT_ATTACHMENT_TYPE } from '../../../common/constants/attachments';
import type { UnifiedAttachment, User } from '../../../common/types/domain';
import type {
  AttachmentReplyCountsResponse,
  AttachmentThreadSummary,
} from '../../../common/types/api/attachment/threads';
import { Operations } from '../../authorization';
import { getAttachmentAuthorizationFilter, getOwnersFilter } from '../../authorization/utils';
import { createCaseError } from '../../common/error';
import { getCaseReferenceId } from '../../common/references';
import { flattenAttachmentSavedObjects } from '../../common/utils';
import type { CasesClientArgs } from '../types';
import { combineFilters } from '../utils';
import { addThreadReply } from './add';
import { decodeUnifiedAttachment, get } from './get';

const ATTRIBUTES = `${CASE_ATTACHMENT_SAVED_OBJECT}.attributes`;
const LATEST_REPLIES_FOR_SUMMARY = 10;
const MAX_THREAD_PARTICIPANTS = 3;

const isComment = (attachment: UnifiedAttachment): boolean =>
  attachment.type === COMMENT_ATTACHMENT_TYPE;

export const getCommentContent = (attachment: UnifiedAttachment): string => {
  if ('data' in attachment && attachment.data != null) {
    const { content } = attachment.data;
    return typeof content === 'string' ? content : '';
  }
  return '';
};

export interface FoundAttachment {
  attachment: UnifiedAttachment;
  caseId?: string;
}

/** Finds authorized attachments, optionally of 1 case, with the id of their case. */
export const findAttachments = async (
  {
    caseId,
    filter,
    sortOrder,
    perPage,
  }: {
    caseId?: string;
    filter?: KueryNode;
    sortOrder: 'asc' | 'desc';
    perPage: number;
  },
  { authorization, services: { attachmentService }, logger }: CasesClientArgs
): Promise<FoundAttachment[]> => {
  const { filter: authorizationFilter, ensureSavedObjectsAreAuthorized } =
    await getAttachmentAuthorizationFilter(authorization, Operations.findComments);

  const response = await attachmentService.find({
    options: {
      ...(caseId != null ? { hasReference: { type: CASE_SAVED_OBJECT, id: caseId } } : {}),
      filter: combineFilters([authorizationFilter, filter]),
      sortField: 'created_at',
      sortOrder,
      page: 1,
      perPage,
    },
  });

  ensureSavedObjectsAreAuthorized(
    response.saved_objects.map(({ id, attributes }) => ({ id, owner: attributes.owner }))
  );

  const caseIdById = new Map(
    response.saved_objects.map(({ id, references }) => [id, getCaseReferenceId(references)])
  );

  return flattenAttachmentSavedObjects(response.saved_objects).flatMap((attachment) => {
    const decoded = decodeUnifiedAttachment(attachment, logger);
    return decoded != null ? [{ attachment: decoded, caseId: caseIdById.get(decoded.id) }] : [];
  });
};

const findReplyAttachments = async (
  { caseId, parentId }: { caseId: string; parentId: string },
  clientArgs: CasesClientArgs
): Promise<UnifiedAttachment[]> => {
  const found = await findAttachments(
    {
      caseId,
      filter: nodeBuilder.is(`${ATTRIBUTES}.parent_id`, parentId),
      sortOrder: 'asc',
      perPage: MAX_REPLIES_PER_THREAD,
    },
    clientArgs
  );

  return found.map(({ attachment }) => attachment);
};

/** Returns the replies of a comment, oldest first. */
export const getReplies = async (
  { caseId, parentId }: { caseId: string; parentId: string },
  clientArgs: CasesClientArgs
): Promise<UnifiedAttachment[]> => {
  try {
    await get({ caseID: caseId, savedObjectId: parentId }, clientArgs);
    return await findReplyAttachments({ caseId, parentId }, clientArgs);
  } catch (error) {
    throw createCaseError({
      message: `Failed to get the replies of comment ${parentId} on case ${caseId}: ${error}`,
      error,
      logger: clientArgs.logger,
    });
  }
};

/** Adds a reply to a comment; replies cannot have replies. */
export const addReply = async (
  { caseId, parentId, content }: { caseId: string; parentId: string; content: string },
  clientArgs: CasesClientArgs
): Promise<UnifiedAttachment> => {
  try {
    const parent = await get({ caseID: caseId, savedObjectId: parentId }, clientArgs);

    if (!isComment(parent)) {
      throw Boom.badRequest('Only comments can have replies.');
    }

    if (parent.parent_id != null) {
      throw Boom.badRequest('You cannot reply to a reply.');
    }

    return await addThreadReply(
      {
        caseId,
        parentId,
        comment: { type: COMMENT_ATTACHMENT_TYPE, owner: parent.owner, data: { content } },
      },
      clientArgs
    );
  } catch (error) {
    throw createCaseError({
      message: `Failed to reply to comment ${parentId} on case ${caseId}: ${error}`,
      error,
      logger: clientArgs.logger,
    });
  }
};

interface ReplyCountsBucket {
  key: string;
  doc_count: number;
  latest: {
    hits: {
      hits: Array<{
        _source?: {
          [CASE_ATTACHMENT_SAVED_OBJECT]?: { created_at?: string; created_by?: User };
        };
      }>;
    };
  };
}

interface ReplyCountsAggregations {
  parents: { buckets: ReplyCountsBucket[] };
}

const toThreadSummary = ({ latest }: ReplyCountsBucket): AttachmentThreadSummary => {
  const replies = latest.hits.hits.flatMap(({ _source: source }) => {
    const reply = source?.[CASE_ATTACHMENT_SAVED_OBJECT];
    return reply != null ? [reply] : [];
  });
  const participants = new Map<string, User>();

  for (const { created_by: createdBy } of replies) {
    const key = createdBy?.profile_uid ?? createdBy?.username;
    if (createdBy != null && key != null && !participants.has(key)) {
      participants.set(key, createdBy);
    }
  }

  return {
    lastReplyAt: replies[0]?.created_at ?? null,
    participants: [...participants.values()].slice(0, MAX_THREAD_PARTICIPANTS),
  };
};

/** Returns the number of replies, latest repliers and last reply time per comment of a case. */
export const getReplyCounts = async (
  { caseId }: { caseId: string },
  clientArgs: CasesClientArgs
): Promise<AttachmentReplyCountsResponse> => {
  const { authorization, unsecuredSavedObjectsClient, services, logger } = clientArgs;

  try {
    const theCase = await services.caseService.getCase({ id: caseId });

    await authorization.ensureAuthorized({
      entities: [{ id: caseId, owner: theCase.attributes.owner }],
      operation: Operations.findComments,
    });

    const { authorizedOwners } = await getAttachmentAuthorizationFilter(
      authorization,
      Operations.findComments
    );

    if (authorizedOwners != null && authorizedOwners.length === 0) {
      return { counts: {}, threads: {} };
    }

    const response = await unsecuredSavedObjectsClient.find<unknown, ReplyCountsAggregations>({
      type: CASE_ATTACHMENT_SAVED_OBJECT,
      hasReference: { type: CASE_SAVED_OBJECT, id: caseId },
      filter: combineFilters([
        authorizedOwners != null
          ? getOwnersFilter(CASE_ATTACHMENT_SAVED_OBJECT, authorizedOwners)
          : undefined,
        fromKueryExpression(`${ATTRIBUTES}.parent_id: *`),
      ]),
      page: 1,
      perPage: 0,
      aggs: {
        parents: {
          terms: { field: `${ATTRIBUTES}.parent_id`, size: MAX_REPLIES_PER_THREAD },
          aggs: {
            latest: {
              top_hits: {
                size: LATEST_REPLIES_FOR_SUMMARY,
                sort: [{ [`${CASE_ATTACHMENT_SAVED_OBJECT}.created_at`]: { order: 'desc' } }],
                _source: [
                  `${CASE_ATTACHMENT_SAVED_OBJECT}.created_at`,
                  `${CASE_ATTACHMENT_SAVED_OBJECT}.created_by`,
                ],
              },
            },
          },
        },
      },
    });

    const buckets = response.aggregations?.parents.buckets ?? [];

    return {
      counts: Object.fromEntries(buckets.map(({ key, doc_count: docCount }) => [key, docCount])),
      threads: Object.fromEntries(buckets.map((bucket) => [bucket.key, toThreadSummary(bucket)])),
    };
  } catch (error) {
    throw createCaseError({
      message: `Failed to get the reply counts of case ${caseId}: ${error}`,
      error,
      logger,
    });
  }
};
