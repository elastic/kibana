/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  INTERNAL_ATTACHMENT_REPLIES_URL,
  INTERNAL_ATTACHMENT_REPLY_COUNTS_URL,
} from '../../../common/constants';
import type {
  AttachmentRepliesResponse,
  AttachmentReplyCountsResponse,
} from '../../../common/types/api/attachment/threads';
import type { UnifiedAttachment } from '../../../common/types/domain';
import { KibanaServices } from '../../common/lib/kibana';
import { convertAttachmentsToCamelCase } from '../../api/utils';
import type { AttachmentUIV2 } from '../types';
import { decodeUnifiedAttachmentsResponse } from '../utils';

const getThreadUrl = (url: string, caseId: string, attachmentId: string): string =>
  url.replace('{case_id}', caseId).replace('{attachment_id}', attachmentId);

export const getReplies = async (
  caseId: string,
  parentId: string,
  signal?: AbortSignal
): Promise<AttachmentUIV2[]> => {
  const { replies } = await KibanaServices.get().http.fetch<AttachmentRepliesResponse>(
    getThreadUrl(INTERNAL_ATTACHMENT_REPLIES_URL, caseId, parentId),
    { method: 'GET', signal }
  );

  return convertAttachmentsToCamelCase(decodeUnifiedAttachmentsResponse(replies));
};

export const postReply = async ({
  caseId,
  parentId,
  content,
}: {
  caseId: string;
  parentId: string;
  content: string;
}): Promise<AttachmentUIV2[]> => {
  const reply = await KibanaServices.get().http.fetch<UnifiedAttachment>(
    getThreadUrl(INTERNAL_ATTACHMENT_REPLIES_URL, caseId, parentId),
    { method: 'POST', body: JSON.stringify({ content }) }
  );

  return convertAttachmentsToCamelCase(decodeUnifiedAttachmentsResponse([reply]));
};

export const getReplyCounts = async (
  caseId: string,
  signal?: AbortSignal
): Promise<AttachmentReplyCountsResponse> =>
  KibanaServices.get().http.fetch<AttachmentReplyCountsResponse>(
    INTERNAL_ATTACHMENT_REPLY_COUNTS_URL.replace('{case_id}', caseId),
    { method: 'GET', signal }
  );
