/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  INTERNAL_ATTACHMENT_REPLIES_URL,
  INTERNAL_ATTACHMENT_REPLY_COUNTS_URL,
  MAX_ATTACHMENT_ID_LENGTH,
  MAX_CASE_ID_LENGTH,
  MAX_COMMENT_LENGTH,
} from '../../../../common/constants';
import type {
  AttachmentRepliesResponse,
  AttachmentReplyCountsResponse,
} from '../../../../common/types/api/attachment/threads';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

const threadParams = schema.object({
  case_id: schema.string({ maxLength: MAX_CASE_ID_LENGTH }),
  attachment_id: schema.string({ maxLength: MAX_ATTACHMENT_ID_LENGTH }),
});

export const postAttachmentReplyRoute = createCasesRoute({
  method: 'post',
  path: INTERNAL_ATTACHMENT_REPLIES_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: {
    params: threadParams,
    body: schema.object({
      content: schema.string({ minLength: 1, maxLength: MAX_COMMENT_LENGTH }),
    }),
  },
  routerOptions: { access: 'internal' },
  handler: async ({ context, request, response }) => {
    try {
      const casesClient = await (await context.cases).getCasesClient();
      const reply = await casesClient.attachments.addReply({
        caseId: request.params.case_id,
        parentId: request.params.attachment_id,
        content: request.body.content,
      });

      return response.ok({ body: reply });
    } catch (error) {
      throw createCaseError({
        message: `Failed to reply in route case id: ${request.params.case_id} attachment id: ${request.params.attachment_id}: ${error}`,
        error,
      });
    }
  },
});

export const getAttachmentRepliesRoute = createCasesRoute({
  method: 'get',
  path: INTERNAL_ATTACHMENT_REPLIES_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: { params: threadParams },
  routerOptions: { access: 'internal' },
  handler: async ({ context, request, response }) => {
    try {
      const casesClient = await (await context.cases).getCasesClient();
      const replies = await casesClient.attachments.getReplies({
        caseId: request.params.case_id,
        parentId: request.params.attachment_id,
      });
      const body: AttachmentRepliesResponse = { replies };

      return response.ok({ body });
    } catch (error) {
      throw createCaseError({
        message: `Failed to get replies in route case id: ${request.params.case_id} attachment id: ${request.params.attachment_id}: ${error}`,
        error,
      });
    }
  },
});

export const getAttachmentReplyCountsRoute = createCasesRoute({
  method: 'get',
  path: INTERNAL_ATTACHMENT_REPLY_COUNTS_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: {
    params: schema.object({ case_id: schema.string({ maxLength: MAX_CASE_ID_LENGTH }) }),
  },
  routerOptions: { access: 'internal' },
  handler: async ({ context, request, response }) => {
    try {
      const casesClient = await (await context.cases).getCasesClient();
      const body: AttachmentReplyCountsResponse = await casesClient.attachments.getReplyCounts({
        caseId: request.params.case_id,
      });

      return response.ok({ body });
    } catch (error) {
      throw createCaseError({
        message: `Failed to get reply counts in route case id: ${request.params.case_id}: ${error}`,
        error,
      });
    }
  },
});
