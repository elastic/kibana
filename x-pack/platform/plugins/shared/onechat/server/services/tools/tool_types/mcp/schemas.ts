/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const configurationSchema = schema.object({
  connector_id: schema.string(),
  mcp_tool_name: schema.string(),
});

// We don't support updating the connector ID or MCP tool name
export const configurationUpdateSchema = schema.object({
  connector_id: schema.never(),
  mcp_tool_name: schema.never(),
});
