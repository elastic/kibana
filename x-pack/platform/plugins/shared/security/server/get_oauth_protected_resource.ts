/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Resolves the OAuth 2.0 protected resource identifier (RFC 8707/RFC 9728) for this Kibana
 * server: an explicitly configured resource wins, otherwise the public base URL, otherwise
 * the internal server base URL. The MCP authorization spec recommends the canonical form
 * without a trailing slash, so one is stripped if present.
 */
export function getOAuthProtectedResource({
  configuredResource,
  publicBaseUrl,
  serverBaseUrl,
}: {
  configuredResource?: string;
  publicBaseUrl?: string;
  serverBaseUrl: string;
}): string {
  const resource = configuredResource ?? publicBaseUrl ?? serverBaseUrl;
  return resource.endsWith('/') ? resource.slice(0, -1) : resource;
}
