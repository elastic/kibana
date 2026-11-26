/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isKiJsonObject,
  isKiJsonRecord,
  readKiDocumentLifecycleStatus,
} from '../../../../../../common/ki_lifecycle_status';
import { conversationIdFromUri, kiIdFromUri } from '../../../../../../common/ki_uri';
import type {
  KiJsonValue,
  KiDocument,
  KiDocumentReference,
} from '../../../../../../common/http_api/knowledge_indicators';
import {
  type KiLifecycleStatus,
  type KiReferenceRelation,
} from '../../../../../../common/step_types/ki';
import {
  getKiAttributeLabel,
  isKiDateAttribute,
  isKiHiddenAttribute,
} from './view_ki_attribute_labels';

export interface KiGovernanceWriter {
  uri: string;
  metadata: Record<string, KiJsonValue>;
}

export interface KiGovernanceView {
  lifecycleStatus?: KiLifecycleStatus;
  createdBy?: KiGovernanceWriter;
  updatedBy?: KiGovernanceWriter;
}

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
  if (!isKiJsonRecord(governance)) {
    return {};
  }

  const lifecycleStatus = readKiDocumentLifecycleStatus(document);

  const provenance = governance.provenance;
  if (!isKiJsonRecord(provenance)) {
    return { lifecycleStatus };
  }

  const toWriterValue = (value: unknown): KiJsonValue | undefined => {
    if (typeof value === 'string') {
      return value;
    }
    if (isKiJsonObject(value as KiJsonValue)) {
      return value as KiJsonValue;
    }
    return undefined;
  };

  return {
    lifecycleStatus,
    createdBy: parseWriter(toWriterValue(provenance.created_by)),
    updatedBy: parseWriter(toWriterValue(provenance.updated_by)),
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

export type KiReferenceItem =
  | { kind: 'ki'; id: string; uri: string; description?: string }
  | { kind: 'conversation'; id: string; uri: string; description?: string }
  | { kind: 'other'; uri: string; description?: string };

/** Groups references whose relation is missing or not one of the known relations. */
export const OTHER_REFERENCE_RELATION = 'other';

export interface KiReferenceGroup {
  relation: KiReferenceRelation | typeof OTHER_REFERENCE_RELATION;
  items: KiReferenceItem[];
}

const isOpenableDerivedFromItem = (item: KiReferenceItem): boolean =>
  item.kind === 'ki' || item.kind === 'conversation';

const toKiReferenceItem = (uri: string, description?: string): KiReferenceItem => {
  const kiId = kiIdFromUri(uri);
  if (kiId !== undefined) {
    return { kind: 'ki', id: kiId, uri, description };
  }
  const conversationId = conversationIdFromUri(uri);
  if (conversationId !== undefined) {
    return { kind: 'conversation', id: conversationId, uri, description };
  }
  return { kind: 'other', uri, description };
};

const REFERENCE_GROUP_ORDER: readonly KiReferenceRelation[] = [
  'derived_from',
  'relates_to',
  'supersedes',
];

const isKnownRelation = (relation: string | undefined): boolean =>
  REFERENCE_GROUP_ORDER.some((knownRelation) => knownRelation === relation);

/**
 * Groups references by relation in a fixed order, followed by an `other` group for references
 * without a known relation. `derived_from` keeps only sources the UI can open: KIs and conversations.
 */
export const groupKiReferences = (
  references: Array<KiDocumentReference | null> | undefined
): KiReferenceGroup[] => {
  if (!Array.isArray(references)) {
    return [];
  }
  const referencesWithUri = references.filter(
    (reference): reference is KiDocumentReference => reference != null && Boolean(reference.uri)
  );
  const knownGroups = REFERENCE_GROUP_ORDER.flatMap((relation) => {
    const items = referencesWithUri
      .filter(({ relation: itemRelation }) => itemRelation === relation)
      .map(({ uri = '', description }) => toKiReferenceItem(uri, description))
      .filter((item) => relation !== 'derived_from' || isOpenableDerivedFromItem(item));
    return items.length > 0 ? [{ relation, items }] : [];
  });
  const otherItems = referencesWithUri
    .filter(({ relation }) => !isKnownRelation(relation))
    .map(({ uri = '', description }) => toKiReferenceItem(uri, description));

  return otherItems.length > 0
    ? [...knownGroups, { relation: OTHER_REFERENCE_RELATION, items: otherItems }]
    : knownGroups;
};

export const documentAttributesToRows = (
  document: KiDocument
): Array<{ key: string; label: string; value: string; isDate: boolean }> => {
  const raw = document.attributes;
  if (!isKiJsonObject(raw)) {
    return [];
  }
  return Object.entries(raw)
    .filter(([key]) => !isKiHiddenAttribute(key))
    .map(([key, value]) => ({
      key,
      label: getKiAttributeLabel(key),
      value: formatKiJsonValueAsString(value),
      isDate: isKiDateAttribute(key),
    }));
};
