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
  /**
   * Configures the "Elastic Slack App" entry point under Significant Events settings,
   * which connects a deployment to the Nightshift Relay service. `relayUrl` is the
   * base URL the Kibana server uses to reach Relay (never exposed to the browser).
   */
  slackApp: schema.object({
    enabled: schema.boolean({ defaultValue: false }),
    relayUrl: schema.maybe(schema.uri({ scheme: ['http', 'https'] })),
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
export const exposeToBrowserConfig = {
  slackApp: {
    // Only the coarse on/off flag is exposed so the UI can decide whether to render
    // the Apps section. `relayUrl` stays server-side.
    enabled: true,
  },
} as const;

export interface StreamsPublicConfig {
  slackApp: {
    enabled: boolean;
  };
}
