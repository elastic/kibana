/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { OBSERVABLE_ATTACHMENT_TYPE } from '../../../../constants/attachments';
import {
  MAX_OBSERVABLE_DESCRIPTION_LENGTH,
  MAX_OBSERVABLE_TYPE_KEY_LENGTH,
  MAX_OBSERVABLE_VALUE_LENGTH,
  MAX_TITLE_LENGTH,
} from '../../../../constants';

export const ObservableAttachmentDataSchema = lazySchema(() =>
  z
    .object({
      typeKey: z.string().min(1).max(MAX_OBSERVABLE_TYPE_KEY_LENGTH),
      value: z.string().min(1).max(MAX_OBSERVABLE_VALUE_LENGTH),
      description: z.string().max(MAX_OBSERVABLE_DESCRIPTION_LENGTH).nullable(),
    })
    .strict()
);

export type ObservableAttachmentData = z.infer<typeof ObservableAttachmentDataSchema>;

export const ObservableAttachmentPayloadSchema = lazySchema(() =>
  z
    .object({
      type: z.literal(OBSERVABLE_ATTACHMENT_TYPE),
      owner: z.string().max(MAX_TITLE_LENGTH),
      data: ObservableAttachmentDataSchema,
    })
    .strict()
);

export type ObservableAttachmentPayload = z.infer<typeof ObservableAttachmentPayloadSchema>;
