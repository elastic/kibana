/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const ExternalServiceResponseSchema = z.object({
  title: z.string(),
  id: z.string(),
  pushedDate: z.string(),
  url: z.string(),
  comments: z
    .array(
      z.object({
        commentId: z.string(),
        pushedDate: z.string(),
        externalCommentId: z.string().optional(),
      })
    )
    .optional(),
});

export type ExternalServiceResponse = z.infer<typeof ExternalServiceResponseSchema>;
