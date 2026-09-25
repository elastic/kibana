/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

/**
 * Zod schema for the `text_note` custom conversation event payload.
 * Shared between the server-side type definition and the browser-side UI definition.
 */
export const textNoteEventSchema = z.object({
  /** Optional heading shown above the note body. Max 256 characters. */
  title: z.string().min(1).max(256).optional(),
  /** Note body text. Max 1000 characters. */
  text: z.string().min(1).max(1000),
});

export type TextNoteEventData = z.infer<typeof textNoteEventSchema>;
