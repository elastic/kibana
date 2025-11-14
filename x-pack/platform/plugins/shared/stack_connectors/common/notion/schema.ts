/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';

// Connector schema
export const NotionConfigSchema = z.object({ sourceId: z.string().optional() }).strict();
export const NotionSecretsSchema = z.object({ token: z.string().optional() }).strict();

// Search action schema
export const NotionSearchActionParamsSchema = z.object({
  query: z.string(),
  queryObjectType: z.enum(['page', 'data_source']),
  startCursor: z.string().optional(),
  pageSize: z.number().optional(),
});
export const NotionSearchActionResponseSchema = z.record(z.any());

// Get page action schema
export const NotionGetPageActionParamsSchema = z.object({ pageId: z.string() });
export const NotionGetPageActionResponseSchema = z.record(z.any());

// Get data source action schema
export const NotionGetDataSourceActionParamsSchema = z.object({ dataSourceId: z.string() });
export const NotionGetDataSourceActionResponseSchema = z.record(z.any()); // Permissive schema to see the full API response during testing

// Original restrictive schema - commented out for testing
// export const NotionGetDataSourceActionResponseSchema = z.object({
//   object: z.string(),
//   id: z.string(),
//   created_at: z.string(),
//   last_edited_at: z.string(),
//   properties: z.object({}),
//   parent: z.object({
//     type: z.string(),
//     database_id: z.string(),
//   }),
//   database_parent: z.object({
//     type: z.string(),
//     page_id: z.string(),
//   }),
//   archived: z.boolean(),
//   is_inline: z.boolean(),
//   icon: z.object({
//     type: z.string(),
//     emoji: z.string(),
//   }),
//   cover: z.object({
//     type: z.string(),
//     external: z.object({
//       url: z.string(),
//     }),
//   }),
//   url: z.string(),
//   title: z.array(
//     z.object({
//       type: z.string(),
//       text: z.object({
//         content: z.string(),
//         link: z.string(),
//       }),
//       annotations: z.object({
//         bold: z.boolean(),
//         italic: z.boolean(),
//         strikethrough: z.boolean(),
//         underline: z.boolean(),
//         code: z.boolean(),
//         color: z.string(),
//       }),
//       plain_text: z.string(),
//       href: z.string(),
//     })
//   ),
// });

// Query data source action schema
const NotionFilterSchema = z
  .object({
    property: z.string(),
  })
  .catchall(z.any());

export const NotionQueryActionParamsSchema = z.object({
  dataSourceId: z.string(),
  filter: NotionFilterSchema.optional(),
  startCursor: z.string().optional(),
  pageSize: z.number().optional(),
});
export const NotionQueryActionResponseSchema = z.record(z.any());
