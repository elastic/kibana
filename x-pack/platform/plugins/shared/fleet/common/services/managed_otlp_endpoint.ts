/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const normalizeEndpoint = (endpoint: string): string => {
  const withScheme = endpoint.includes('://') ? endpoint : `https://${endpoint}`;
  try {
    const url = new URL(withScheme);
    const path = url.pathname === '/' ? '' : url.pathname;
    return `${url.hostname}${path}`;
  } catch {
    return endpoint.toLowerCase();
  }
};

/**
 * Whether an endpoint is the managed OTLP endpoint. The scheme and the port do not matter. Fleet
 * applies the settings it recommends for the managed endpoint to the outputs that use it.
 */
export const isManagedOtlpEndpointUrl = (endpoint: string, managedUrl?: string): boolean => {
  if (!managedUrl) return false;
  return normalizeEndpoint(endpoint) === normalizeEndpoint(managedUrl);
};
