/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

export const configSchema = schema.object({
  canvas: schema.object({
    enabled: schema.boolean({ defaultValue: false }),
  }),
  /**
   * Outbound client for streams-config-distributor (`PUT /v1/units/<unit-id>`
   * and `POST /v1/validate`). When `url` is unset, unit publish and validation
   * are skipped so local canvas saves still work.
   */
  configDistributor: schema.object(
    {
      url: schema.maybe(schema.uri({ scheme: ['http', 'https'] })),
      ssl: schema.object(
        {
          certificatePath: schema.maybe(schema.string({ maxLength: 4096 })),
          keyPath: schema.maybe(schema.string({ maxLength: 4096 })),
          certificateAuthoritiesPath: schema.maybe(schema.string({ maxLength: 4096 })),
        },
        { defaultValue: {} }
      ),
    },
    { defaultValue: { ssl: {} } }
  ),
  preconfigured: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    stream_definitions: schema.arrayOf(schema.any(), { defaultValue: [] }),
  }),
  workers: schema.object({
    patternExtraction: schema.object({
      enabled: schema.boolean({ defaultValue: true }),
      minThreads: schema.number({ defaultValue: 0, min: 0 }),
      maxThreads: schema.number({ defaultValue: 2, min: 1 }),
      maxQueue: schema.number({ defaultValue: 10, min: 1 }),
      idleTimeout: schema.duration({ defaultValue: '30s' }),
      taskTimeout: schema.duration({ defaultValue: '30s' }),
    }),
  }),
});

export type StreamsConfig = TypeOf<typeof configSchema>;

export type PatternExtractionWorkerConfig = StreamsConfig['workers']['patternExtraction'];

/**
 * The following map is passed to the server plugin setup under the
 * exposeToBrowser: option, and controls which of the above config
 * keys are allow-listed to be available in the browser config.
 *
 * NOTE: anything exposed here will be visible in the UI dev tools,
 * and therefore MUST NOT be anything that is sensitive information!
 */
export const exposeToBrowserConfig = {} as const;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface StreamsPublicConfig {}
