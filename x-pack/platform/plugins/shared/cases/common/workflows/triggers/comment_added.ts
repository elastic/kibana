/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';
import { CaseResponseProperties } from '../../bundled-types.gen';

export const CommentAddedTriggerId = 'cases.commentAdded' as const;

export const commentAddedEventSchema = z.object({
  case: CaseResponseProperties.describe('The case after adding the comment.'),
  commentType: z.string().describe('The comment type that was added to the case.'),
});

export type CommentAddedEvent = z.infer<typeof commentAddedEventSchema>;

export const commentAddedTriggerCommonDefinition: CommonTriggerDefinition = {
  id: CommentAddedTriggerId,
  eventSchema: commentAddedEventSchema,
};
