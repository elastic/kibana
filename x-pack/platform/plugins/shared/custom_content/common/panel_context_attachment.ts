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

/**
 * Ceiling for the captured panel height.
 */
export const MAX_PREVIEW_HEIGHT = 1200;

/** Ceiling for the identifier- and label-sized strings in this schema. */
export const MAX_SHORT_FIELD_LENGTH = 256;

/**
 * Serialized-size budget for the opaque fetch context (`filters`, `query`, `esql_variables` etc).
 * A normal dashboard's filters are well under 1KB; past this the preview drops them and
 * renders unfiltered rather than carrying an unbounded payload into the conversation.
 */
export const MAX_FETCH_CONTEXT_BYTES = 10_000;

export const customContentContextAttachmentDataSchema = z.object({
  panel_template: z.string().max(CUSTOM_CONTENT_MAX_TEMPLATE_SCHEMA_LENGTH),
  esql_query: z.string().max(CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH).optional(),
  panel_title: z.string().max(MAX_SHORT_FIELD_LENGTH).optional(),
  embeddable_id: z.string().max(MAX_SHORT_FIELD_LENGTH),
  time_range: z
    .object({
      from: z.string().max(MAX_SHORT_FIELD_LENGTH),
      to: z.string().max(MAX_SHORT_FIELD_LENGTH),
    })
    .optional(),
  panel_height: z.number().int().min(1).max(MAX_PREVIEW_HEIGHT).optional(),
  esql_variables: z
    .array(
      z.object({
        key: z.string().max(MAX_SHORT_FIELD_LENGTH),
        value: z.union([
          z.string().max(4096),
          z.number(),
          z.array(z.union([z.string().max(4096), z.number()])),
        ]),
        type: z.nativeEnum(ESQLVariableType),
      })
    )
    .optional(),
  filters: z.array(z.record(z.string().max(MAX_SHORT_FIELD_LENGTH), z.unknown())).optional(),
  query: z.record(z.string().max(MAX_SHORT_FIELD_LENGTH), z.unknown()).optional(),
  is_approximate: z.boolean().optional(),
  project_routing: z.string().max(1024).optional(),
});

export type CustomContentContextAttachmentData = z.infer<
  typeof customContentContextAttachmentDataSchema
>;
