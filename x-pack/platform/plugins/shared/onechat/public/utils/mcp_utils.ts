/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function extractServerIdFromToolId(toolId: string): string | undefined {
  // MCP tool format: mcp.{serverId}.{toolName}
  if (!toolId.startsWith('mcp.')) {
    return undefined;
  }

  const parts = toolId.split('.');
  return parts.length >= 3 ? parts[1] : undefined;
}

