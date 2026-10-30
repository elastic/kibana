/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { appDocumentSchema } from '@kbn/custom-app-common';

/** The kind of attachment a custom app panel is sent to chat as. */
export const CUSTOM_APP_CONTEXT_ATTACHMENT_TYPE = 'platform.custom_app.app_context';

const MAX_SHORT_FIELD_LENGTH = 256;

/** What the agent is shown of a panel: which one it is, its title, and the app as it stands. */
export const customAppContextAttachmentDataSchema = lazySchema(() =>
  z.object({
    // The id of the panel, which the agent passes back to say which one it is changing. An app
    // created in the conversation has no panel yet, so it has none and is addressed by attachment.
    embeddable_id: z.string().min(1).max(MAX_SHORT_FIELD_LENGTH).optional(),
    panel_title: z.string().max(MAX_SHORT_FIELD_LENGTH).optional(),
    document: appDocumentSchema,
  })
);

export type CustomAppContextAttachmentData = z.output<typeof customAppContextAttachmentDataSchema>;
