/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { UserSchema } from '../user/v1';

/** A note on a task. Kept apart from case comments so task threads never reach the case activity. */
export const CaseTaskCommentAttributesSchema = z.object({
  task_id: z.string(),
  case_id: z.string(),
  comment: z.string(),
  owner: z.string(),
  created_at: z.string(),
  created_by: UserSchema,
});

export const CaseTaskCommentSchema = CaseTaskCommentAttributesSchema.extend({
  id: z.string(),
  version: z.string(),
});

export type CaseTaskCommentAttributes = z.infer<typeof CaseTaskCommentAttributesSchema>;
export type CaseTaskComment = z.infer<typeof CaseTaskCommentSchema>;
