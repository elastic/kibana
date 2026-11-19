/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isoDateTime, lazySchema, z } from '@kbn/zod/v4';
import { actorSchema, entityIdSchema, ENTITY_ID_NOTE, tagsSchema } from './common';
import { ID_MAX_LENGTH, MAX_DESCRIPTION_LENGTH, MAX_NAME_LENGTH } from './constants';

/** Kind */

export const importConfigKindSchema = lazySchema(() =>
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

export type ImportConfigKind = z.infer<typeof importConfigKindSchema>;

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

const importConfigMetadataSchema = lazySchema(() =>
  z
    .object({
      name: metadataNameSchema.describe(METADATA_NAME_DESCRIPTION),
      description: metadataDescriptionSchema.optional().describe(METADATA_DESCRIPTION_DESCRIPTION),
      tags: metadataTagsSchema.optional().describe(METADATA_TAGS_DESCRIPTION),
      routing_tags: metadataTagsSchema.optional().describe(METADATA_ROUTING_TAGS_DESCRIPTION),
    })
    .strict()
    .describe('Import metadata.')
    .meta({ id: 'alerting_import_config_metadata' })
);

/** The PATCH counterpart of {@link importConfigMetadataSchema}: leaves move, and clear, independently. */
const importConfigMetadataPatchSchema = lazySchema(() =>
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
      'The ID of the connector that receives the events for this import. It cannot be changed after the import is created.'
    )
);

const ROUTING_TAGS_KIND_MESSAGE = 'metadata.routing_tags is only allowed when kind is "alert".';

const isRoutingTagsAllowedForKind = (data: {
  kind: ImportConfigKind;
  metadata: { routing_tags?: string[] };
}): boolean => data.kind === 'alert' || data.metadata.routing_tags === undefined;

const importConfigDataBaseSchema = lazySchema(() =>
  z.object({
    kind: importConfigKindSchema,
    metadata: importConfigMetadataSchema,
    connector_id: connectorIdSchema,
  })
);

/**
 * Data accepted when creating an import config. The `id` is optional; when omitted, Kibana
 * generates one.
 */
export const createImportConfigDataSchema = lazySchema(() =>
  importConfigDataBaseSchema
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
    .meta({ id: 'alerting_new_import_config' })
);

export type CreateImportConfigData = z.infer<typeof createImportConfigDataSchema>;

/**
 * Data accepted when updating an import config. Omitted fields are kept and `null` clears an
 * optional field. `connector_id` is not accepted: an import keeps the connector it was created
 * with.
 */
export const updateImportConfigDataSchema = lazySchema(() =>
  z
    .object({
      kind: importConfigKindSchema.optional(),
      metadata: importConfigMetadataPatchSchema.optional(),
    })
    .strict()
    .meta({ id: 'alerting_update_import_config' })
);

export type UpdateImportConfigData = z.infer<typeof updateImportConfigDataSchema>;

/** An import config as returned by the import config client. */
export const importConfigResponseSchema = lazySchema(() =>
  importConfigDataBaseSchema
    .extend({
      id: z.string().describe('Unique import identifier.'),
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
    .meta({ id: 'alerting_import_config_response' })
);

export type ImportConfigResponse = z.infer<typeof importConfigResponseSchema>;

/** Sort field for listing import configs. */
export const findImportConfigsSortFieldSchema = lazySchema(() =>
  z.enum(['name', 'kind']).describe('The available fields to sort imports by.')
);

export type FindImportConfigsSortField = z.infer<typeof findImportConfigsSortFieldSchema>;
