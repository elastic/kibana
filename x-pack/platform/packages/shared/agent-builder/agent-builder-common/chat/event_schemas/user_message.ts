/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { Attachment } from '../../attachments/attachments';
import {
  ATTACHMENT_REF_OPERATION,
  ATTACHMENT_REF_ACTOR,
} from '../../attachments/versioned_attachment';

// Attachment is a deeply generic discriminated type — not deeply validated.
// z.custom carries the TS type so the drift guard can assert both directions;
// the predicate keeps at least the "must be an object" check at runtime.
const attachmentSchema = z.custom<Attachment>((v) => typeof v === 'object' && v !== null);

const attachmentVersionRefSchema = z.object({
  attachment_id: z.string(),
  version: z.number(),
  operation: z.enum(Object.values(ATTACHMENT_REF_OPERATION)).optional(),
  actor: z.enum(Object.values(ATTACHMENT_REF_ACTOR)).optional(),
});

export const userMessageEventDataSchema = z.object({
  message: z.string(),
  attachment_refs: z.array(attachmentVersionRefSchema).optional(),
  attachments: z.array(attachmentSchema).optional(),
  attachment_context: z.string().optional(),
});
