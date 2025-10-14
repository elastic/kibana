/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor } from '@kbn/core/server';
import { schema, type TypeOf } from '@kbn/config-schema';

/**
 * Authentication configuration for MCP servers
 */
const mcpAuthSchema = schema.object({
  type: schema.oneOf([schema.literal('apiKey')], {
    defaultValue: 'apiKey',
  }),
  headers: schema.recordOf(schema.string(), schema.string(), {
    defaultValue: {},
  }),
});

/**
 * Individual MCP server configuration
 */
const mcpServerSchema = schema.object({
  id: schema.string({ minLength: 1 }),
  name: schema.string({ minLength: 1 }),
  enabled: schema.boolean({ defaultValue: true }),
  url: schema.uri({ scheme: ['http', 'https'] }),
  auth: schema.maybe(mcpAuthSchema),
  options: schema.maybe(
    schema.object({
      timeout: schema.number({ defaultValue: 30000, min: 1000, max: 300000 }),
      retries: schema.number({ defaultValue: 3, min: 0, max: 10 }),
    })
  ),
});

export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  mcp: schema.object({
    servers: schema.arrayOf(mcpServerSchema, { defaultValue: [] }),
  }),
});

export type OnechatConfig = TypeOf<typeof configSchema>;
export type McpServerConfig = TypeOf<typeof mcpServerSchema>;
export type McpAuthConfig = TypeOf<typeof mcpAuthSchema>;

export const config: PluginConfigDescriptor<OnechatConfig> = {
  schema: configSchema,
};
