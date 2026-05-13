/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface AnonymizationCapabilitiesCandidate {
  show?: boolean;
  manage?: boolean;
}

const isOptionalBoolean = (value: unknown): value is boolean | undefined =>
  value === undefined || typeof value === 'boolean';

export const isAnonymizationCapabilities = (
  value: unknown
): value is AnonymizationCapabilitiesCandidate => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return isOptionalBoolean(candidate.show) && isOptionalBoolean(candidate.manage);
};
