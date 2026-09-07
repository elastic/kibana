/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  CUSTOM_CONTENT_MAX_TEMPLATE_SCHEMA_LENGTH,
  CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH,
} from '@kbn/custom-content-common';

export const CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE = 'platform.custom_content.panel_context';

export const customContentContextAttachmentDataSchema = z.object({
  panel_template: z.string().max(CUSTOM_CONTENT_MAX_TEMPLATE_SCHEMA_LENGTH),
  esql_query: z.string().max(CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH).optional(),
  panel_title: z.string().max(256).optional(),
  embeddable_id: z.string().max(256),
  /**
   * The range the panel was rendering with when it was sent to chat. A snapshot, not a
   * mirror: it lets the chat preview show what the user was looking at instead of a
   * default range, but it does not follow later changes to the dashboard's picker.
   */
  time_range: z
    .object({
      from: z.string().max(256),
      to: z.string().max(256),
    })
    .optional(),
  /**
   * The panel's rendered height in pixels when it was sent to chat. Measured from the
   * panel's own container, which is outside the sandboxed iframe and therefore readable —
   * unlike the content inside it. Bounded because it is written by the browser.
   */
  panel_height: z.number().int().min(1).max(4000).optional(),
});

export type CustomContentContextAttachmentData = z.infer<
  typeof customContentContextAttachmentDataSchema
>;
