/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KiDocument, KiJsonValue } from './http_api/knowledge_indicators';
import { KI_LIFECYCLE_STATUSES, type KiLifecycleStatus } from './step_types/ki';

export const isKiJsonRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isKiJsonObject = (
  value: KiJsonValue | undefined
): value is { [key: string]: KiJsonValue } => isKiJsonRecord(value);

const isKiLifecycleStatus = (value: string): value is KiLifecycleStatus =>
  (KI_LIFECYCLE_STATUSES as readonly string[]).includes(value);

export const toOptionalKiLifecycleStatus = (value: unknown): KiLifecycleStatus | undefined => {
  if (typeof value !== 'string' || !isKiLifecycleStatus(value)) {
    return undefined;
  }
  return value;
};

export const readKiDocumentLifecycleStatus = (
  document: KiDocument
): KiLifecycleStatus | undefined =>
  toOptionalKiLifecycleStatus(document.governance?.lifecycle?.status);
