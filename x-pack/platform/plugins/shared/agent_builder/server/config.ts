/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor } from '@kbn/core/server';
import { schema, type TypeOf } from '@kbn/config-schema';

export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  githubBaseUrl: schema.string({ defaultValue: 'https://github.com' }),
  topSnippets: schema.object({
    numSnippets: schema.number({ defaultValue: 2, min: 1, max: 10 }),
    numWords: schema.number({ defaultValue: 750, min: 1, max: 5000 }),
  }),
  memory: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    showToolCalls: schema.boolean({ defaultValue: true }),
    roundStartRetrieval: schema.object({
      enabled: schema.boolean({ defaultValue: true }),
      method: schema.oneOf(
        [schema.literal('bm25')],
        { defaultValue: 'bm25' }
      ),
    }),
    extraction: schema.object({
      method: schema.oneOf(
        [schema.literal('llm'), schema.literal('chunking')],
        { defaultValue: 'llm' }
      ),
      connectorId: schema.maybe(schema.string()),
      chunking: schema.object({
        maxChunkChars: schema.number({ defaultValue: 300, min: 50, max: 2000 }),
        overlapChars: schema.number({ defaultValue: 30, min: 0, max: 200 }),
      }),
    }),
  }),
});

export type AgentBuilderConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<AgentBuilderConfig> = {
  exposeToBrowser: {
    memory: {
      showToolCalls: true,
    },
  },
  schema: configSchema,
};
