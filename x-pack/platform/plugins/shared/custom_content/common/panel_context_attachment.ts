/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ESQLVariableType } from '@kbn/esql-types';
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
  // The fields below snapshot how the panel was rendering when it was sent to chat. A
  // snapshot, not a mirror — none of them follow the dashboard afterwards. Filters and the
  // KQL query are deliberately absent: they only change the numbers, while an unresolved
  // `?variable` makes Elasticsearch reject the query outright.
  time_range: z
    .object({
      from: z.string().max(256),
      to: z.string().max(256),
    })
    .optional(),
  /** Measured from the panel's own container, which is outside the sandboxed iframe. */
  panel_height: z.number().int().min(1).max(4000).optional(),
  esql_variables: z
    .array(
      z.object({
        key: z.string().max(256),
        value: z.union([
          z.string().max(1024),
          z.number(),
          z.array(z.union([z.string().max(1024), z.number()])).max(100),
        ]),
        type: z.nativeEnum(ESQLVariableType),
      })
    )
    .max(50)
    .optional(),
});

export type CustomContentContextAttachmentData = z.infer<
  typeof customContentContextAttachmentDataSchema
>;
