/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface OAuthErrorInfo {
  isOAuthError: boolean;
  serverName?: string;
}

export function detectOAuthError(error: Error): OAuthErrorInfo {
  const message = error.message || '';
  const match = message.match(/OAuth authentication required for MCP server "([^"]+)"/);

  if (match) {
    return {
      isOAuthError: true,
      serverName: match[1],
    };
  }

  return { isOAuthError: false };
}

