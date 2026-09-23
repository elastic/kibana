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

export const streamsSupportedTelemetrySchema = z
  .array(streamsSignalSchema)
  .min(1)
  .max(5)
  .refine((signals) => new Set(signals).size === signals.length, {
    message: 'supported_telemetry must not contain duplicate signals',
  });

/** Route `context` from streams-spec `defs.schema.yaml#/$defs/ottl_routing_context`. */
export const streamsOttlRoutingContextSchema = z.enum([
  'record',
  'resource',
  'log',
  'span',
  'metric',
  'datapoint',
  'profile',
]);

const displayFieldsSchema = {
  name: z.string().max(1024).optional(),
  description: z.string().max(10000).optional(),
};

export const streamsConfigEntrySchema = z.strictObject({
  name: z.string().min(1).max(256),
  value: z.unknown(),
  telemetry: streamsSupportedTelemetrySchema.optional(),
});

const componentFields = {
  ...displayFieldsSchema,
  id: streamsUnitIdentifierSchema,
  type: z.string().min(1).max(256),
  supported_telemetry: streamsSupportedTelemetrySchema,
  config: z.array(streamsConfigEntrySchema).max(500).optional(),
};

const componentBaseSchema = z.strictObject(componentFields);

const sourceSchema = z.strictObject({
  ...componentFields,
  path_template: z.string().max(2048).optional(),
});

const identifierListSchema = z.array(streamsUnitIdentifierSchema).max(2000);

const pipelineRouteBase = {
  when: z.string().max(10000).optional(),
  processors: identifierListSchema.optional(),
  action: z.enum(['copy', 'move']).optional(),
  context: streamsOttlRoutingContextSchema.optional(),
  telemetry: streamsSupportedTelemetrySchema.optional(),
};

/**
 * Pipeline route from streams-spec `pipeline.schema.yaml#/$defs/route`.
 * `destinations` and `pipelines` are mutually exclusive (`oneOf`).
 */
export const streamsPipelineRouteSchema = z.union([
  z.strictObject({
    ...pipelineRouteBase,
    destinations: identifierListSchema.min(1),
  }),
  z.strictObject({
    ...pipelineRouteBase,
    pipelines: identifierListSchema.min(1),
  }),
]);

const pipelineConfigTelemetry = {
  telemetry: streamsSupportedTelemetrySchema.optional(),
};

/**
 * Closed pipeline config names from streams-spec `pipeline.schema.yaml`.
 */
export const streamsPipelineConfigEntrySchema = z.discriminatedUnion('name', [
  z.strictObject({
    name: z.literal('sources'),
    value: identifierListSchema.min(1),
    ...pipelineConfigTelemetry,
  }),
  z.strictObject({
    name: z.literal('processors'),
    value: identifierListSchema,
    ...pipelineConfigTelemetry,
  }),
  z.strictObject({
    name: z.literal('routes'),
    value: z.array(streamsPipelineRouteSchema).min(1).max(2000),
    ...pipelineConfigTelemetry,
  }),
  z.strictObject({
    name: z.literal('destinations'),
    value: identifierListSchema.min(1),
    ...pipelineConfigTelemetry,
  }),
]);

export const streamsPipelineSchema = z
  .strictObject({
    ...displayFieldsSchema,
    id: streamsUnitIdentifierSchema,
    supported_telemetry: streamsSupportedTelemetrySchema,
    config: z.array(streamsPipelineConfigEntrySchema).min(1).max(500),
  })
  .refine(
    (pipeline) => {
      const hasDestinations = pipeline.config.some((entry) => entry.name === 'destinations');
      const hasRoutes = pipeline.config.some((entry) => entry.name === 'routes');
      return !(hasDestinations && hasRoutes);
    },
    { message: 'destinations and routes are mutually exclusive', path: ['config'] }
  );

/**
 * Authored Streams unit document from streams-spec `unit.schema.yaml`.
 * Canvas saves sources, destinations, and pipelines incrementally, so Kibana
 * does not require `minItems: 1` here. Completeness and remaining semantic
 * graph rules are enforced by the config-distributor (`transpiler.Compile()`).
 */
export const streamsUnitSchema = z.strictObject({
  sources: z.array(sourceSchema).max(2000).default([]),
  processors: z.array(componentBaseSchema).max(2000).optional(),
  destinations: z.array(componentBaseSchema).max(2000).default([]),
  pipelines: z.array(streamsPipelineSchema).max(2000).default([]),
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
  return [...unit.sources, ...(unit.processors ?? []), ...unit.destinations, ...unit.pipelines].map(
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
  export type Pipeline = z.infer<typeof streamsPipelineSchema>;
  export type PipelineConfigEntry = z.infer<typeof streamsPipelineConfigEntrySchema>;
  export type PipelineRoute = z.infer<typeof streamsPipelineRouteSchema>;
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
