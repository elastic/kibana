/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { UserActionTypes } from '../action/v1';
import {
  AttachmentRequestSchemaV2,
  AttachmentRequestWithoutRefsSchemaV2,
} from '../../../api_zod/attachment/v2';

export const CommentUserActionPayloadSchema = z.object({ comment: AttachmentRequestSchemaV2 });

export const CommentUserActionPayloadWithoutIdsSchema = z.object({
  comment: AttachmentRequestWithoutRefsSchemaV2,
});

export const CommentUserActionSchema = z.object({
  type: z.literal(UserActionTypes.comment),
  payload: CommentUserActionPayloadSchema,
});

export const CommentUserActionWithoutIdsSchema = CommentUserActionSchema;
