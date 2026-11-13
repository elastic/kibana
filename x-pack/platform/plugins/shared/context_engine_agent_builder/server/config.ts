/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor } from '@kbn/core/server';
import { schema, type TypeOf } from '@kbn/config-schema';

export const configSchema = schema.object({
  memory: schema.object({
    store: schema.oneOf(
      [
        schema.object({ type: schema.literal('elasticsearch') }),
        schema.object({
          type: schema.literal('supermemory'),
          url: schema.uri({
            scheme: ['http', 'https'],
            defaultValue: 'https://api.supermemory.ai',
          }),
          apiKey: schema.string({ minLength: 1 }),
          namespacePrefix: schema.string({ defaultValue: 'kibana' }),
        }),
        schema.object({
          type: schema.literal('mem0'),
          url: schema.uri({ scheme: ['http', 'https'], defaultValue: 'https://api.mem0.ai' }),
          apiKey: schema.string({ minLength: 1 }),
          namespacePrefix: schema.string({ defaultValue: 'kibana' }),
        }),
        schema.object({
          type: schema.literal('agentcore'),
          region: schema.string({ minLength: 1 }),
          memoryId: schema.string({ minLength: 1 }),
          accessKeyId: schema.string({ minLength: 1 }),
          secretAccessKey: schema.string({ minLength: 1 }),
          namespacePrefix: schema.string({ defaultValue: 'kibana' }),
        }),
      ],
      { defaultValue: { type: 'elasticsearch' as const } }
    ),
  }),
});

export type ContextEngineAgentBuilderConfig = TypeOf<typeof configSchema>;
export type MemoryStoreConfig = ContextEngineAgentBuilderConfig['memory']['store'];

export const config: PluginConfigDescriptor<ContextEngineAgentBuilderConfig> = {
  schema: configSchema,
};
