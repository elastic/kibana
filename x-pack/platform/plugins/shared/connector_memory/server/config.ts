/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';
import { DEFAULT_AI_INDEX_ID } from '../common/constants';

export const configSchema = schema.object({
  /** Off by default: this is a prototype that writes knowledge indicators from agent traffic. */
  enabled: schema.boolean({ defaultValue: false }),
  aiIndexId: schema.string({ defaultValue: DEFAULT_AI_INDEX_ID, minLength: 1, maxLength: 128 }),
  ttlDays: schema.number({ defaultValue: 30, min: 1, max: 365 }),
  /** What a connector learns until an admin says otherwise (the Context tab). */
  learn: schema.object({
    reach: schema.oneOf(
      [schema.literal('direct'), schema.literal('siblings'), schema.literal('area')],
      { defaultValue: 'direct' }
    ),
    maxFiles: schema.number({ defaultValue: 100, min: 1, max: 500 }),
    maxDepth: schema.number({ defaultValue: 2, min: 0, max: 6 }),
    summarize: schema.boolean({ defaultValue: false }),
    /** Files remembered by name from one listing or search an agent made, beyond direct hits. */
    sampleSize: schema.number({ defaultValue: 20, min: 1, max: 50 }),
  }),
  /** The model that writes summaries when a crawl names none. Without one, summaries are the start of the file. */
  inferenceConnectorId: schema.maybe(schema.string({ minLength: 1, maxLength: 255 })),
  /** Files read per space per day, across everything that reads (a read costs a unit, and a summary needs one). */
  dailyReadBudget: schema.number({ defaultValue: 2000, min: 1, max: 50000 }),
  maxCallsPerMinute: schema.number({ defaultValue: 120, min: 1, max: 6000 }),
  /** Back pressure on summaries, across every run: files in flight, and model calls per minute. */
  maxConcurrentSummaries: schema.number({ defaultValue: 2, min: 1, max: 8 }),
  maxSummariesPerMinute: schema.number({ defaultValue: 30, min: 1, max: 600 }),
  maxDownloadBytes: schema.number({ defaultValue: 4_000_000, min: 1024, max: 25_000_000 }),
  /** Live checks that a user can still open the per-user files lookup would show them. */
  access: schema.object({
    ttlSeconds: schema.number({ defaultValue: 300, min: 0, max: 86400 }),
    maxChecksPerLookup: schema.number({ defaultValue: 16, min: 1, max: 50 }),
  }),
});

export type ConnectorMemoryConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<ConnectorMemoryConfig> = {
  // The browser registers its page only when the feature is on.
  exposeToBrowser: { enabled: true },
  schema: configSchema,
};
