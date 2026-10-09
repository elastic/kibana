/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readKiDocumentLifecycleStatus } from '../../../../../../common/ki_lifecycle_status';
import type {
  KiJsonValue,
  KiDocument,
} from '../../../../../../common/http_api/knowledge_indicators';
import { type KiLifecycleStatus } from '../../../../../../common/step_types/ki';

export interface KiGovernanceWriter {
  uri: string;
  metadata: Record<string, KiJsonValue>;
}

export interface KiGovernanceView {
  lifecycleStatus?: KiLifecycleStatus;
  createdBy?: KiGovernanceWriter;
  updatedBy?: KiGovernanceWriter;
}

export const isKiJsonObject = (
  value: KiJsonValue | undefined
): value is { [key: string]: KiJsonValue } =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseWriter = (value: KiJsonValue | undefined): KiGovernanceWriter | undefined => {
  if (typeof value === 'string') {
    return value.length > 0 ? { uri: value, metadata: {} } : undefined;
  }
  if (!isKiJsonObject(value)) {
    return undefined;
  }
  const uriValue = value.uri;
  if (typeof uriValue !== 'string' || uriValue.length === 0) {
    return undefined;
  }

  return {
    uri: uriValue,
    metadata: isKiJsonObject(value.metadata) ? { ...value.metadata } : {},
  };
};

export const readKiGovernance = (document: KiDocument): KiGovernanceView => {
  const governance = document.governance;
  if (!isKiJsonObject(governance)) {
    return {};
  }

  const lifecycleStatus = readKiDocumentLifecycleStatus(document);

  const provenance = governance.provenance;
  if (!isKiJsonObject(provenance)) {
    return { lifecycleStatus };
  }

  return {
    lifecycleStatus,
    createdBy: parseWriter(provenance.created_by),
    updatedBy: parseWriter(provenance.updated_by),
  };
};

/** Coerces KI JSON values to a display string; tolerates malformed workflow provenance types. */
export const formatKiJsonValueAsString = (value: KiJsonValue): string => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(', ');
  }
  if (typeof value === 'boolean' || typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'string') {
    return value;
  }
  return '';
};

export const documentAttributesToRows = (
  document: KiDocument
): Array<{ key: string; value: string }> => {
  const raw = document.attributes;
  if (!isKiJsonObject(raw)) {
    return [];
  }
  return Object.entries(raw).map(([key, value]) => ({
    key,
    value: formatKiJsonValueAsString(value),
  }));
};
