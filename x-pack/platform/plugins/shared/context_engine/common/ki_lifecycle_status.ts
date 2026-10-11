/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KiDocument, KiJsonValue } from './http_api/knowledge_indicators';
import type { KiLifecycleStatus } from './step_types/ki';

export const isKiJsonRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isKiJsonObject = (
  value: KiJsonValue | undefined
): value is { [key: string]: KiJsonValue } => isKiJsonRecord(value);

export const toOptionalKiLifecycleStatus = (value: unknown): KiLifecycleStatus | undefined => {
  if (value === 'active' || value === 'deleted') {
    return value;
  }
  return undefined;
};

export const readKiDocumentLifecycleStatus = (
  document: KiDocument
): KiLifecycleStatus | undefined => {
  const governance = document.governance;
  const rawStatus =
    isKiJsonRecord(governance) && isKiJsonRecord(governance.lifecycle)
      ? governance.lifecycle.status
      : undefined;
  return toOptionalKiLifecycleStatus(rawStatus);
};
