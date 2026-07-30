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
} from './constants';

export const CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE = 'platform.custom_content.panel_context';

export const customContentContextAttachmentDataSchema = z.object({
  panel_template: z.string().max(CUSTOM_CONTENT_MAX_TEMPLATE_SCHEMA_LENGTH),
  esql_query: z.string().max(CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH).optional(),
  panel_title: z.string().max(256).optional(),
  embeddable_id: z.string().max(256),
});

export type CustomContentContextAttachmentData = z.infer<
  typeof customContentContextAttachmentDataSchema
>;
