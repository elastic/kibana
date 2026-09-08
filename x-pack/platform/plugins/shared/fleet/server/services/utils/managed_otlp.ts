/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '..';

export const getManagedOtlpEndpoint = (): string | undefined => {
  return appContextService.getCloud()?.managedOtlp?.url;
};

const normalizeEndpoint = (endpoint: string): string => {
  try {
    return new URL(endpoint).host;
  } catch {
    return endpoint.toLowerCase();
  }
};

export const isManagedOtlpEndpoint = (endpoint: string): boolean => {
  const managedUrl = getManagedOtlpEndpoint();
  if (!managedUrl) return false;
  return normalizeEndpoint(endpoint) === normalizeEndpoint(managedUrl);
};
