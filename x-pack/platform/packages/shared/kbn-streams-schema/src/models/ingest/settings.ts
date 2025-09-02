/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

export type IngestStreamSettings = {
  'index.number_of_replicas'?: { value: number };
  'index.number_of_shards'?: { value: number };
  'index.refresh_interval'?: { value: string | -1 };
};

export type InheritedIngestStreamSettings = {
  [K in keyof IngestStreamSettings]: IngestStreamSettings[K] & { from: string };
};

export const ingestStreamSettingsSchema: z.Schema<IngestStreamSettings> = z.object({
  'index.number_of_replicas': z.optional(z.object({ value: z.number() })),
  'index.number_of_shards': z.optional(z.object({ value: z.number() })),
  'index.refresh_interval': z.optional(z.object({ value: z.string() })),
});

export const inheritedIngestStreamSettingsSchema: z.Schema<InheritedIngestStreamSettings> =
  z.object({
    'index.number_of_replicas': z.optional(z.object({ value: z.number(), from: z.string() })),
    'index.number_of_shards': z.optional(z.object({ value: z.number(), from: z.string() })),
    'index.refresh_interval': z.optional(z.object({ value: z.string(), from: z.string() })),
  });
