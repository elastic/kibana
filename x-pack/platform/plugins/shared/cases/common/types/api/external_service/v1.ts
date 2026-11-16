/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_TITLE_LENGTH } from '../../../constants';

export const ExternalServiceResponseSchema = z.object({
  title: z.string().max(MAX_TITLE_LENGTH),
  id: z.string().max(512),
  pushedDate: z.string().max(50),
  url: z.string().max(2048),
  comments: z
    .array(
      z.object({
        commentId: z.string().max(512),
        pushedDate: z.string().max(50),
        externalCommentId: z.string().max(512).optional(),
      })
    )
    .optional(),
});

export type ExternalServiceResponse = z.infer<typeof ExternalServiceResponseSchema>;
