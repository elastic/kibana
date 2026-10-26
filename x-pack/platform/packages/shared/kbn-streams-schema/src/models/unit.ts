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
 * Canvas saves sources, destinations, and pipelines incrementally, so this
 * schema does not require `minItems: 1`. The unit HTTP routes do not parse
 * requests with this schema. The config-distributor validates authored
 * documents (`transpiler.Compile()`).
 */
export const streamsUnitSchema = z.strictObject({
  sources: z.array(sourceSchema).max(2000).default([]),
  processors: z.array(componentBaseSchema).max(2000).optional(),
  destinations: z.array(componentBaseSchema).max(2000).default([]),
  pipelines: z.array(streamsPipelineSchema).max(2000).default([]),
});

export const streamsUnitUiMetadataSchema = recursiveRecord.default({});

/**
 * Named plaintext credentials for a unit. Each key is a credential name that a
 * config value references as `{ credential: <name> }`; values are never stored
 * in `unit`. Kibana encrypts this map at rest (ESO) and seals each value under
 * the project wrap key for the distributor `credentials[]` sidecar.
 */
export const streamsUnitSecretsSchema = z
  .record(streamsUnitIdentifierSchema, z.string().max(16384))
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
  // Every provided key must be referenced as `{ credential: <key> }` (400 otherwise),
  // and every reference needs a provided or stored secret (400 otherwise).
  // Stored secrets no config value references any more are dropped.
  secrets: streamsUnitSecretsSchema.optional(),
});

/**
 * The most components one stats request can name. The UI shows at most 50 rows of a kind at
 * a time, and a zoomed out map fits about 30, so 100 covers a table page twice over.
 */
export const MAX_STREAMS_UNIT_STATS_COMPONENTS = 100;

/**
 * Stats request. A component ref is a discriminated union on `kind`. Adding a kind is
 * adding a member.
 */
export const streamsUnitStatsComponentRefSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('destination'), id: streamsUnitIdentifierSchema }),
  z.strictObject({ kind: z.literal('processor'), id: streamsUnitIdentifierSchema }),
]);

export const streamsUnitStatsFilterSchema = z.strictObject({
  /**
   * Omit to read every config hash in the window, with no hash filter. The distributor
   * generates a 64-character lowercase SHA-256 hex and only requires a non-empty value,
   * so the 128 cap is headroom, not a format check.
   */
  config_hash: z.string().min(1).max(128).optional(),
  /** Absolute range, ISO 8601. Both fields are required when present. */
  time_range: z
    .strictObject({ start: z.iso.datetime(), end: z.iso.datetime() })
    .refine(({ start, end }) => Date.parse(start) < Date.parse(end), {
      message: 'time_range.start must be before time_range.end',
    })
    .optional(),
});

export const streamsUnitStatsRequestSchema = z.strictObject({
  filter: streamsUnitStatsFilterSchema.optional(),
  /**
   * Lists the unit components to receive stats on, destinations and processors together, with
   * no duplicates.
   * - Omitted: every destination and processor in the unit. This fails with a 400 when the unit
   *   has more than `MAX_STREAMS_UNIT_STATS_COMPONENTS` of them, so name the components instead.
   * - An empty array: no components.
   * - A list: only those components, and nothing from the rest of the unit.
   */
  components: z
    .array(streamsUnitStatsComponentRefSchema)
    .max(MAX_STREAMS_UNIT_STATS_COMPONENTS)
    .refine((refs) => new Set(refs.map(({ kind, id }) => `${kind}:${id}`)).size === refs.length, {
      message: 'components must not contain duplicates',
    })
    .optional(),
});

export const streamsUnitStatsErrorSchema = z.object({
  code: z.string(),
  reason: z.string(),
});

/** `value: null` means no data. `unit` is always set: a UCUM string, for example `s` or `{item}`. */
const statsValueSchema = z.object({ value: z.number().nullable(), unit: z.string() });
/** A rate is always per unit of time. `time_unit` is always set: the UCUM time unit, for example `s`. */
const statsRateSchema = statsValueSchema.extend({ time_unit: z.string() });

export const streamsUnitStatsSeriesSchema = z.object({
  bucket_ms: z.number(),
  points: z.array(z.object({ start: z.string(), value: z.number() })),
});

export const streamsUnitStatsDestinationResultSchema = z.object({
  error: streamsUnitStatsErrorSchema.optional(),
  latency: z.object({ average: statsValueSchema }),
  events: z.object({
    incoming: z.object({
      total: statsValueSchema,
      rate: statsRateSchema,
      series: streamsUnitStatsSeriesSchema,
    }),
    /**
     * Items that failed in this destination, per second: every outcome other than "success".
     * The destination is the last hop, so each of them is its own failure.
     */
    failed: z.object({ rate: statsRateSchema }),
  }),
});

export const streamsUnitStatsProcessorResultSchema = z.object({
  error: streamsUnitStatsErrorSchema.optional(),
  processing_duration: z.object({ average: statsValueSchema }),
  events: z.object({
    incoming: z.object({
      rate: statsRateSchema,
    }),
    /**
     * Items that failed in this processor, per second: outcome "failure". Items a downstream
     * component refused are not counted, they belong to that component. null until
     * opentelemetry-collector-contrib#52158 is fixed.
     */
    failed: z.object({ rate: statsRateSchema }),
  }),
});

export const streamsUnitStatsMetaSchema = z.object({
  window: z.object({ start: z.string(), end: z.string() }),
  /** Config hash that the server filtered on. Absent when the request had no `config_hash`. */
  config_hash: z.string().optional(),
});

export const streamsUnitStatsResponseSchema = z.object({
  components: z.object({
    /** Component references by their IDs. */
    destinations: z.record(z.string(), streamsUnitStatsDestinationResultSchema),
    processors: z.record(z.string(), streamsUnitStatsProcessorResultSchema),
  }),
  meta: streamsUnitStatsMetaSchema,
});

export const collectUnitComponentIds = (unit: StreamsUnit.Configuration): string[] => {
  const components: ReadonlyArray<{ id?: unknown }> = [
    ...(Array.isArray(unit.sources) ? unit.sources : []),
    ...(Array.isArray(unit.processors) ? unit.processors : []),
    ...(Array.isArray(unit.destinations) ? unit.destinations : []),
    ...(Array.isArray(unit.pipelines) ? unit.pipelines : []),
  ];

  return components.flatMap((component) =>
    typeof component?.id === 'string' ? [component.id] : []
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
  export type StatsRequest = z.infer<typeof streamsUnitStatsRequestSchema>;
  export type StatsComponentRef = z.infer<typeof streamsUnitStatsComponentRefSchema>;
  export type StatsError = z.infer<typeof streamsUnitStatsErrorSchema>;
  export type StatsSeries = z.infer<typeof streamsUnitStatsSeriesSchema>;
  export type StatsDestinationResult = z.infer<typeof streamsUnitStatsDestinationResultSchema>;
  export type StatsProcessorResult = z.infer<typeof streamsUnitStatsProcessorResultSchema>;
  export type StatsMeta = z.infer<typeof streamsUnitStatsMetaSchema>;
  export type StatsResponse = z.infer<typeof streamsUnitStatsResponseSchema>;
  export interface ConfigurationSavedObjectAttributes {
    unit_id: Identifier;
    unit: Configuration;
    secrets: Secrets;
  }
  export interface UiMetadataSavedObjectAttributes {
    metadata: UiMetadata;
  }
}
