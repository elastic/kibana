/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, isoDateTime, lazySchema } from '@kbn/zod/v4';
import { actorSchema, queryIntSchema, tagsSchema } from './common';
import {
  FIND_DEFAULT_PER_PAGE,
  FIND_MAX_RESULT_WINDOW,
  ID_MAX_LENGTH,
  MAX_FIELD_NAME_LENGTH,
  MAX_PER_PAGE,
  MAX_SEARCH_LENGTH,
} from './constants';
import { alertEventSourceSchema } from './create_alert_event_data_schema';
import { alertEventSeveritySchema } from './severity';

const MAX_NAME_LENGTH = 256;
const MAX_DESCRIPTION_LENGTH = 1024;
const MAX_URL_LENGTH = 2048;

export const importKindSchema = lazySchema(() => z.enum(['custom', 'managed']));

export type ImportKind = z.infer<typeof importKindSchema>;

const nameSchema = lazySchema(() => z.string().trim().min(1).max(MAX_NAME_LENGTH));
const descriptionSchema = lazySchema(() => z.string().trim().max(MAX_DESCRIPTION_LENGTH));
const ownerSchema = lazySchema(() => z.string().trim().min(1).max(MAX_NAME_LENGTH));
const externalConfigUrlSchema = lazySchema(() => z.url().max(MAX_URL_LENGTH));
const fingerprintFieldSchema = lazySchema(() =>
  z.string().trim().min(1).max(MAX_FIELD_NAME_LENGTH)
);

/** Fields the user sets, shared by create and the response. */
const importConfigFieldShape = {
  name: lazySchema(() => nameSchema.describe('The name of the import.')),
  description: lazySchema(() =>
    descriptionSchema.optional().describe('A description of the import.')
  ),
  tags: tagsSchema.optional().describe('Tags to organize imports. Defaults to none.'),
  routing_tags: tagsSchema
    .optional()
    .describe('Tags stored for later alert routing. Nothing reads them yet.'),
  default_severity: alertEventSeveritySchema
    .optional()
    .describe('Severity given to every imported alert.'),
  fingerprint_field: lazySchema(() =>
    fingerprintFieldSchema
      .optional()
      .describe(
        'Field of the webhook payload that identifies one alert series, for example `monitor_id` or `labels.env`.'
      )
  ),
  owner: lazySchema(() => ownerSchema.optional().describe('Who owns this import.')),
  external_config_url: lazySchema(() =>
    externalConfigUrlSchema
      .optional()
      .describe('Where the source system is configured to send to this import.')
  ),
};

/**
 * Body of the create import API. The server creates the webhook connector, the workflow and the
 * config record from it.
 */
export const createImportDataSchema = lazySchema(() =>
  z
    .object({
      kind: z.literal('custom').optional(),
      ...importConfigFieldShape,
      source: alertEventSourceSchema
        .optional()
        .describe('The `source` stamped on imported alerts. Defaults to a slug of the name.'),
    })
    .strict()
);

export type CreateImportData = z.infer<typeof createImportDataSchema>;

/**
 * Body of the create import API for a managed import: the user's own vendor connector (for
 * example Datadog) plus the fields they set. No connector or workflow is created for the
 * connector itself. The import takes the connector's id as its own id.
 */
export const createManagedImportDataSchema = lazySchema(() =>
  z
    .object({
      kind: z.literal('managed'),
      connector_id: z
        .string()
        .min(1)
        .max(ID_MAX_LENGTH)
        .describe(
          'An existing connector whose type has the `importAlerts` feature and has receiving events turned on.'
        ),
      name: nameSchema
        .optional()
        .describe('The name of the import. Defaults to the name of the connector.'),
      description: importConfigFieldShape.description,
      tags: importConfigFieldShape.tags,
      routing_tags: importConfigFieldShape.routing_tags,
      default_severity: importConfigFieldShape.default_severity,
      owner: importConfigFieldShape.owner,
      external_config_url: importConfigFieldShape.external_config_url,
    })
    .strict()
);

export type CreateManagedImportData = z.infer<typeof createManagedImportDataSchema>;

/** Body of the create import API: a custom import (the default) or a managed one. */
export const createAnyImportDataSchema = lazySchema(() =>
  z.union([createManagedImportDataSchema, createImportDataSchema])
);

export type CreateAnyImportData = z.infer<typeof createAnyImportDataSchema>;

/** Body of the update import API. Only the config record changes, not the generated workflow. */
export const updateImportDataSchema = lazySchema(() =>
  z
    .object({
      name: nameSchema.optional(),
      description: descriptionSchema.optional(),
      enabled: z.boolean().optional().describe('Whether the import accepts alerts.'),
      tags: tagsSchema.optional(),
      routing_tags: tagsSchema.optional(),
      default_severity: alertEventSeveritySchema.optional(),
      fingerprint_field: fingerprintFieldSchema.optional(),
      owner: ownerSchema.optional(),
      external_config_url: externalConfigUrlSchema.optional(),
    })
    .strict()
);

export type UpdateImportData = z.infer<typeof updateImportDataSchema>;

export const importResponseSchema = lazySchema(() =>
  z
    .object({
      id: z
        .string()
        .describe('The unique identifier of the import. Imported alerts carry it as `rule.id`.'),
      name: z.string(),
      description: z.string().optional(),
      kind: importKindSchema.describe(
        '`custom` for imports with their own webhook, `managed` for imports on a vendor connector.'
      ),
      enabled: z.boolean(),
      source: z.string().describe('The `source` stamped on imported alerts.'),
      connector_id: z
        .string()
        .describe(
          'The connector that receives the payloads: an `.inboundWebhook` connector the import created, or for a managed import the existing vendor connector. A managed import has the same id as its connector.'
        ),
      connector_type_id: z
        .string()
        .optional()
        .describe('The connector type, for example `.datadog`. Absent on older custom imports.'),
      workflow_id: z
        .string()
        .describe(
          'The workflow that turns payloads into alerts. For a managed import it is a shared, managed workflow.'
        ),
      tags: z.array(z.string()),
      routing_tags: z.array(z.string()),
      default_severity: z.string().optional(),
      owner: z.string().optional(),
      external_config_url: z.string().optional(),
      fingerprint_field: z.string().optional(),
      created_by: actorSchema.nullable(),
      created_at: isoDateTime(),
      updated_by: actorSchema.nullable(),
      updated_at: isoDateTime(),
    })
    .meta({ id: 'alerting_import_response' })
);

export type ImportResponse = z.infer<typeof importResponseSchema>;

export const importIdParamsSchema = lazySchema(() =>
  z.object({ id: z.string().min(1).max(ID_MAX_LENGTH) }).strict()
);

export type ImportIdParams = z.infer<typeof importIdParamsSchema>;

export const findImportsRequestSchema = lazySchema(() =>
  z
    .object({
      page: queryIntSchema({ min: 1, max: FIND_MAX_RESULT_WINDOW })
        .optional()
        .describe('The page number to return. Defaults to 1.'),
      per_page: queryIntSchema({ min: 1, max: MAX_PER_PAGE })
        .optional()
        .describe('The number of imports to return per page. Defaults to 20.'),
      search: z.string().trim().min(1).max(MAX_SEARCH_LENGTH).optional(),
    })
    .strict()
    .refine(
      ({ page = 1, per_page = FIND_DEFAULT_PER_PAGE }) => page * per_page <= FIND_MAX_RESULT_WINDOW,
      { message: `page * per_page cannot exceed ${FIND_MAX_RESULT_WINDOW}.`, path: ['page'] }
    )
);

export type FindImportsRequest = z.infer<typeof findImportsRequestSchema>;

export const findImportsResponseSchema = lazySchema(() =>
  z.object({
    items: z.array(importResponseSchema),
    total: z.number(),
    page: z.number(),
    per_page: z.number(),
  })
);

export type FindImportsResponse = z.infer<typeof findImportsResponseSchema>;

/** Where and how a source system sends to an import. Shown once, the token cannot be read again. */
export const importCredentialsSchema = lazySchema(() =>
  z.object({
    url: z.string().describe('The webhook URL to send payloads to.'),
    token: z.string().describe('The ingest token. Send it as `Authorization: Bearer <token>`.'),
  })
);

export type ImportCredentials = z.infer<typeof importCredentialsSchema>;

export const importCredentialsResponseSchema = lazySchema(() =>
  z.object({
    credentials: importCredentialsSchema,
    public_base_url_configured: z
      .boolean()
      .describe(
        'Whether `server.publicBaseUrl` is set. When false the URL is a best guess from the server address.'
      ),
  })
);

export type ImportCredentialsResponse = z.infer<typeof importCredentialsResponseSchema>;

export const createImportResponseSchema = lazySchema(() =>
  z.object({
    import: importResponseSchema,
    url: z.string().describe('The webhook URL of the import.'),
    credentials: importCredentialsSchema
      .optional()
      .describe(
        'Present when a token was minted for the import, which only custom imports do. A managed import reuses the connector token the user already has, or rotates it on request.'
      ),
    public_base_url_configured: z.boolean(),
  })
);

export type CreateImportResponse = z.infer<typeof createImportResponseSchema>;

export const deleteImportRequestSchema = lazySchema(() =>
  z
    .object({
      deleteResources: z
        .stringbool()
        .optional()
        .describe('Also delete the connector and the workflow the import created.'),
    })
    .strict()
);

export type DeleteImportRequest = z.infer<typeof deleteImportRequestSchema>;

export const testImportRequestSchema = lazySchema(() =>
  z
    .object({
      payload: z
        .record(z.string(), z.any())
        .optional()
        .describe('The webhook payload to send. Defaults to a sample built from the import.'),
    })
    .strict()
);

export type TestImportRequest = z.infer<typeof testImportRequestSchema>;

export const testImportResponseSchema = lazySchema(() =>
  z.object({
    execution_id: z.string().describe('The workflow execution the test started.'),
    payload: z.record(z.string(), z.any()).describe('The payload that was sent.'),
  })
);

export type TestImportResponse = z.infer<typeof testImportResponseSchema>;

export const IMPORT_STATUSES = [
  'disabled',
  'connector_missing',
  'workflow_missing',
  'failing',
  'waiting',
  'receiving',
  'idle',
] as const;

export const importStatusSchema = lazySchema(() => z.enum(IMPORT_STATUSES));

export type ImportStatus = z.infer<typeof importStatusSchema>;

export const importStatsItemSchema = lazySchema(() =>
  z.object({
    id: z.string().describe('The import the stats belong to.'),
    status: importStatusSchema.describe(
      '`connector_missing`, `workflow_missing`, `disabled` and `failing` need attention. `waiting` has received nothing yet, `receiving` got an alert in the last 24 hours, `idle` did not.'
    ),
    alert_series_count: z.number().describe('How many distinct alert series the import created.'),
    last_alert_at: isoDateTime()
      .nullable()
      .describe('When the import last created an alert, or null when it never did.'),
    connector_exists: z.boolean(),
    receiving_events: z
      .boolean()
      .describe(
        'False when the connector of a managed import has receiving events turned off. Always true for custom imports.'
      ),
    workflow_exists: z.boolean(),
    workflow_enabled: z.boolean().describe('False when the workflow is disabled or missing.'),
    last_execution: z
      .object({
        status: z.string(),
        started_at: z.string().nullable(),
        finished_at: z.string().nullable(),
      })
      .nullable()
      .describe('The latest run of the import workflow, test runs included.'),
  })
);

export type ImportStatsItem = z.infer<typeof importStatsItemSchema>;

export const importStatsResponseSchema = lazySchema(() =>
  z.object({ items: z.array(importStatsItemSchema) })
);

export type ImportStatsResponse = z.infer<typeof importStatsResponseSchema>;
