/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { recursiveRecord } from '../shared/record_types';

/**
 * Component / unit identifiers from streams-spec `defs.schema.yaml`.
 * Lowercase alphanumeric and hyphens, no leading or trailing hyphen.
 */
export const streamsUnitIdentifierSchema = z
  .string()
  .min(1)
  .max(256)
  .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/);

export const streamsSignalSchema = z.enum(['logs', 'metrics', 'traces', 'docs', 'profiles']);

export const streamsSupportedTelemetrySchema = z.array(streamsSignalSchema).min(1).max(5);

const displayFieldsSchema = z.object({
  name: z.string().max(1024).optional(),
  description: z.string().max(10000).optional(),
});

const configEntrySchema = z.object({
  name: z.string().min(1).max(256),
  value: z.unknown(),
  telemetry: streamsSupportedTelemetrySchema.optional(),
});

const componentBaseSchema = displayFieldsSchema.extend({
  id: streamsUnitIdentifierSchema,
  type: z.string().min(1).max(256),
  supported_telemetry: streamsSupportedTelemetrySchema,
  config: z.array(configEntrySchema).max(500).optional(),
});

const sourceSchema = componentBaseSchema.extend({
  path_template: z.string().max(2048).optional(),
});

/**
 * Authored Streams unit document (sources, processors, destinations).
 * Per-type config and semantic graph rules are enforced by the
 * config-distributor validation endpoint (`transpiler.Compile()`).
 */
export const streamsUnitSchema = z.object({
  sources: z.array(sourceSchema).max(2000).optional(),
  processors: z.array(componentBaseSchema).max(2000).optional(),
  destinations: z.array(componentBaseSchema).max(2000).optional(),
});

export const streamsUnitUiMetadataSchema = recursiveRecord.default({});

/**
 * Named plaintext credentials for a unit. Keys are referenced from authored
 * unit YAML (e.g. a destination config value); values are never stored in
 * `unit`. Kibana encrypts this map at rest (ESO) and re-encrypts each value
 * under the project public key before `PUT /v1/units/{id}`.
 */
export const streamsUnitSecretsSchema = z
  .record(z.string().min(1).max(256), z.string().max(16384))
  .refine((secrets) => Object.keys(secrets).length <= 500, {
    message: 'At most 500 unit secrets are allowed',
  });

export const streamsUnitResponseSchema = z.object({
  unit: streamsUnitSchema,
  ui_metadata: streamsUnitUiMetadataSchema,
});

export const streamsUnitUpsertRequestSchema = z.object({
  unit: streamsUnitSchema,
  ui_metadata: streamsUnitUiMetadataSchema,
  // Omitted on PUT means keep the stored secrets. Provided keys merge with the
  // stored keys (the UI only sends newly entered values; GET does not return them).
  secrets: streamsUnitSecretsSchema.optional(),
});

export const collectUnitComponentIds = (unit: StreamsUnit.Configuration): string[] => {
  return [...(unit.sources ?? []), ...(unit.processors ?? []), ...(unit.destinations ?? [])].map(
    ({ id }) => id
  );
};

export const findDuplicateUnitComponentIds = (unit: StreamsUnit.Configuration): string[] => {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const id of collectUnitComponentIds(unit)) {
    if (seen.has(id)) {
      duplicates.add(id);
    }
    seen.add(id);
  }

  return [...duplicates];
};

/* eslint-disable @typescript-eslint/no-namespace */
export namespace StreamsUnit {
  export type Identifier = z.infer<typeof streamsUnitIdentifierSchema>;
  export type Configuration = z.infer<typeof streamsUnitSchema>;
  export type UiMetadata = z.infer<typeof streamsUnitUiMetadataSchema>;
  export type Secrets = z.infer<typeof streamsUnitSecretsSchema>;
  export type GetResponse = z.infer<typeof streamsUnitResponseSchema>;
  export type UpsertRequest = z.infer<typeof streamsUnitUpsertRequestSchema>;
  export interface ConfigurationSavedObjectAttributes {
    unit_id: Identifier;
    unit: Configuration;
    secrets: Secrets;
  }
  export interface UiMetadataSavedObjectAttributes {
    metadata: UiMetadata;
  }
}
