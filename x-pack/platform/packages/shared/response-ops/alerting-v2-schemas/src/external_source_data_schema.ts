/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isoDateTime, lazySchema, z } from '@kbn/zod/v4';
import { actorSchema, entityIdSchema, ENTITY_ID_NOTE, queryIntSchema, tagsSchema } from './common';
import {
  FIND_DEFAULT_PER_PAGE,
  FIND_MAX_RESULT_WINDOW,
  ID_MAX_LENGTH,
  EXTERNAL_SOURCE_TYPES,
  MAX_DESCRIPTION_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PER_PAGE,
  MAX_SEARCH_LENGTH,
} from './constants';

/** Kind */

export const externalSourceKindSchema = lazySchema(() =>
  z
    .union([
      z
        .literal('alert')
        .describe(
          'Each incoming event creates or updates an alert that is tracked until it recovers.'
        ),
      z
        .literal('signal')
        .describe(
          'Each incoming event is stored as a signal you can query. Alerts are not created and notifications are not sent.'
        ),
    ])
    .describe('Whether events from this import become alerts (`alert`) or signals (`signal`).')
);

export type ExternalSourceKind = z.infer<typeof externalSourceKindSchema>;

/** Type */

export const externalSourceTypeSchema = lazySchema(() =>
  z
    .enum(EXTERNAL_SOURCE_TYPES)
    .describe(
      'The source the import receives events from. Kibana creates a connector of this type, with no authentication, to receive them. It cannot be changed after the import is created.'
    )
);

export type ExternalSourceType = z.infer<typeof externalSourceTypeSchema>;

/** Metadata */

const METADATA_NAME_DESCRIPTION = 'Import name.';
const METADATA_DESCRIPTION_DESCRIPTION =
  'Human-readable description of the import. Omit to leave it unset; send `null` on PATCH to clear it. An empty string is rejected.';
const METADATA_TAGS_DESCRIPTION = 'Tags for categorization, e.g. ["production", "datadog"].';
const METADATA_ROUTING_TAGS_DESCRIPTION =
  'Routing tags that link alerts from this import to action policies. An action policy applies when its `matcher.tags` contains at least one of these tags. Only allowed when kind is "alert".';

const metadataNameSchema = lazySchema(() => z.string().min(1).max(MAX_NAME_LENGTH));
const metadataDescriptionSchema = lazySchema(() =>
  z.string().max(MAX_DESCRIPTION_LENGTH).trim().min(1)
);
const metadataTagsSchema = lazySchema(() => tagsSchema.min(1));

const externalSourceMetadataSchema = lazySchema(() =>
  z
    .object({
      name: metadataNameSchema.describe(METADATA_NAME_DESCRIPTION),
      description: metadataDescriptionSchema.optional().describe(METADATA_DESCRIPTION_DESCRIPTION),
      tags: metadataTagsSchema.optional().describe(METADATA_TAGS_DESCRIPTION),
      routing_tags: metadataTagsSchema.optional().describe(METADATA_ROUTING_TAGS_DESCRIPTION),
    })
    .strict()
    .describe('Import metadata.')
    .meta({ id: 'alerting_external_source_metadata' })
);

/** The PATCH counterpart of {@link externalSourceMetadataSchema}: leaves move, and clear, independently. */
const externalSourceMetadataPatchSchema = lazySchema(() =>
  z
    .object({
      name: metadataNameSchema.optional().describe(METADATA_NAME_DESCRIPTION),
      description: metadataDescriptionSchema
        .nullable()
        .optional()
        .describe(METADATA_DESCRIPTION_DESCRIPTION),
      tags: metadataTagsSchema.nullable().optional().describe(METADATA_TAGS_DESCRIPTION),
      routing_tags: metadataTagsSchema
        .nullable()
        .optional()
        .describe(METADATA_ROUTING_TAGS_DESCRIPTION),
    })
    .strict()
    .describe('Import metadata to change. Omitted fields are kept.')
);

/** Connector */

const connectorIdSchema = lazySchema(() =>
  z
    .string()
    .min(1)
    .max(ID_MAX_LENGTH)
    .describe(
      'The ID of the connector that receives the events for this import. Kibana creates it with the import, and it cannot be changed.'
    )
);

const ROUTING_TAGS_KIND_MESSAGE = 'metadata.routing_tags is only allowed when kind is "alert".';

const isRoutingTagsAllowedForKind = (data: {
  kind: ExternalSourceKind;
  metadata: { routing_tags?: string[] };
}): boolean => data.kind === 'alert' || data.metadata.routing_tags === undefined;

const externalSourceDataBaseSchema = lazySchema(() =>
  z.object({
    type: externalSourceTypeSchema,
    kind: externalSourceKindSchema,
    metadata: externalSourceMetadataSchema,
  })
);

/**
 * The stored fields of an external source that callers set, which a PATCH is merged into and
 * validated against. The connector is created with the import and is not part of it.
 */
export const externalSourceDataSchema = lazySchema(() =>
  externalSourceDataBaseSchema.strict().refine(isRoutingTagsAllowedForKind, {
    message: ROUTING_TAGS_KIND_MESSAGE,
    path: ['metadata', 'routing_tags'],
  })
);

export type ExternalSourceData = z.infer<typeof externalSourceDataSchema>;

/**
 * Data accepted when creating an external source. The `id` is optional; when omitted, Kibana
 * generates one. Kibana creates a connector of the given `type` for the import.
 */
export const createExternalSourceDataSchema = lazySchema(() =>
  externalSourceDataBaseSchema
    .extend({
      id: entityIdSchema
        .optional()
        .describe(
          `The import ID. If omitted, Kibana generates one. If an import with this ID already exists, the request fails with a 409 error. ${ENTITY_ID_NOTE}`
        ),
    })
    .strict()
    .refine(isRoutingTagsAllowedForKind, {
      message: ROUTING_TAGS_KIND_MESSAGE,
      path: ['metadata', 'routing_tags'],
    })
    .meta({ id: 'alerting_new_external_source' })
);

export type CreateExternalSourceData = z.infer<typeof createExternalSourceDataSchema>;

/**
 * Data accepted when creating or replacing an external source at a known ID. The ID comes from the
 * path. A create makes a connector of the given `type`. A replace keeps the existing connector,
 * and its `type` must match the stored one.
 */
export const putExternalSourceDataSchema = lazySchema(() =>
  externalSourceDataBaseSchema
    .strict()
    .refine(isRoutingTagsAllowedForKind, {
      message: ROUTING_TAGS_KIND_MESSAGE,
      path: ['metadata', 'routing_tags'],
    })
    .meta({ id: 'alerting_put_external_source' })
);

export type PutExternalSourceData = z.infer<typeof putExternalSourceDataSchema>;

/**
 * Data accepted when updating an external source. Omitted fields are kept and `null` clears an
 * optional field. `type` is not accepted: an import keeps the source and connector it was
 * created with.
 */
export const updateExternalSourceDataSchema = lazySchema(() =>
  z
    .object({
      kind: externalSourceKindSchema.optional(),
      metadata: externalSourceMetadataPatchSchema.optional(),
    })
    .strict()
    .meta({ id: 'alerting_update_external_source' })
);

export type UpdateExternalSourceData = z.infer<typeof updateExternalSourceDataSchema>;

/** An external source as returned by the external source client. */
export const externalSourceResponseSchema = lazySchema(() =>
  externalSourceDataBaseSchema
    .extend({
      id: z.string().describe('Unique import identifier.'),
      connector_id: connectorIdSchema,
      type: z
        .string()
        .max(256)
        .describe(
          'The source the import receives events from. It cannot be changed after creation.'
        ),
      version: z
        .number()
        .int()
        .min(1)
        .describe('Configuration version of the import, incremented on every change.'),
      created_by: actorSchema.nullable().describe('Actor who created the import.'),
      created_at: isoDateTime().describe('ISO timestamp when the import was created.'),
      updated_by: actorSchema.nullable().describe('Actor who last updated the import.'),
      updated_at: isoDateTime().describe('ISO timestamp when the import was last updated.'),
    })
    .meta({ id: 'alerting_external_source_response' })
);

export type ExternalSourceResponse = z.infer<typeof externalSourceResponseSchema>;

/** Sort field for listing external sources. */
export const findExternalSourcesSortFieldSchema = lazySchema(() =>
  z.enum(['name', 'kind', 'type']).describe('The available fields to sort imports by.')
);

export type FindExternalSourcesSortField = z.infer<typeof findExternalSourcesSortFieldSchema>;

/** Query parameters for the find external sources (list) API. */
export const findExternalSourcesRequestSchema = lazySchema(() =>
  z
    .object({
      page: queryIntSchema({ min: 1, max: FIND_MAX_RESULT_WINDOW })
        .optional()
        .describe('The page number to return. Defaults to 1.'),
      per_page: queryIntSchema({ min: 1, max: MAX_PER_PAGE })
        .optional()
        .describe('The number of imports to return per page. Defaults to 20.'),
      search: z
        .string()
        .trim()
        .min(1)
        .max(MAX_SEARCH_LENGTH)
        .optional()
        .describe('A text string to search across import names and descriptions.'),
      sort_field: findExternalSourcesSortFieldSchema
        .optional()
        .describe('The field to sort imports by.'),
      sort_order: z.enum(['asc', 'desc']).optional().describe('The sort direction.'),
      connector_id: connectorIdSchema
        .optional()
        .describe('Only return the imports that use this connector.'),
      type: externalSourceTypeSchema
        .optional()
        .describe('Only return the imports that receive events from this source.'),
    })
    .strict()
    .refine(
      ({ page = 1, per_page = FIND_DEFAULT_PER_PAGE }) => page * per_page <= FIND_MAX_RESULT_WINDOW,
      { message: `page * per_page cannot exceed ${FIND_MAX_RESULT_WINDOW}.`, path: ['page'] }
    )
);

export type FindExternalSourcesRequest = z.infer<typeof findExternalSourcesRequestSchema>;

/** A page of external sources. */
export const findExternalSourcesResponseSchema = lazySchema(() =>
  z
    .object({
      items: z.array(externalSourceResponseSchema).describe('The list of imports.'),
      total: z.number().describe('The number of imports matching the query.'),
      page: z.number().describe('The current page number.'),
      per_page: z.number().describe('The number of imports per page.'),
    })
    .describe('Paginated list of imports.')
    .meta({ id: 'alerting_external_source_list_response' })
);

export type FindExternalSourcesResponse = z.infer<typeof findExternalSourcesResponseSchema>;
