/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const configSchema = schema.object({
  experimental: schema.maybe(
    schema.object({
      significantEventsEnabled: schema.maybe(schema.boolean({ defaultValue: false })),
    })
  ),
});

export type StreamsConfig = TypeOf<typeof configSchema>;

/**
 * The following map is passed to the server plugin setup under the
 * exposeToBrowser: option, and controls which of the above config
 * keys are allow-listed to be available in the browser config.
 *
 * NOTE: anything exposed here will be visible in the UI dev tools,
 * and therefore MUST NOT be anything that is sensitive information!
 */
export const exposeToBrowserConfig = {
  experimental: {
    significantEventsEnabled: true,
  },
} as const;

export interface StreamsPublicConfig {
  experimental?: {
    significantEventsEnabled?: boolean;
  };
}
