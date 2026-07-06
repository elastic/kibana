/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

export const configSchema = schema.object({
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
  relayService: schema.maybe(
    schema.object({
      url: schema.string(),
      tls: schema.maybe(
        schema.object(
          {
            verificationMode: schema.oneOf(
              [schema.literal('none'), schema.literal('certificate'), schema.literal('full')],
              { defaultValue: 'full' }
            ),
            certificateAuthorities: schema.maybe(
              schema.oneOf([schema.string(), schema.arrayOf(schema.string(), { minSize: 1 })])
            ),
            certificate: schema.maybe(schema.string()),
            key: schema.maybe(schema.string()),
          },
          {
            validate: (rawConfig) => {
              if (rawConfig.certificate && !rawConfig.key) {
                return 'must specify [tls.key] when [tls.certificate] is specified';
              }
              if (rawConfig.key && !rawConfig.certificate) {
                return 'must specify [tls.certificate] when [tls.key] is specified';
              }
            },
          }
        )
      ),
    })
  ),
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
