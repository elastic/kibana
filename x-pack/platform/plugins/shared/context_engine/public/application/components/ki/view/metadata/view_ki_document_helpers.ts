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

export interface KiReferenceItem {
  uri: string;
  description?: string;
  /** The id of the referenced KI, set for `ki://` URIs only. */
  kiId?: string;
  /** The id of the referenced Agent Builder conversation, set for `conversation://` URIs only. */
  conversationId?: string;
}

export interface KiReferenceGroup {
  relation: KiReferenceRelation;
  items: KiReferenceItem[];
}

const REFERENCE_GROUP_ORDER: readonly KiReferenceRelation[] = [
  'derived_from',
  'relates_to',
  'supersedes',
];

/**
 * Groups references by relation in a fixed order, skipping unknown relations and empty groups.
 * `derived_from` keeps only sources the UI can open: KIs and conversations.
 */
export const groupKiReferences = (references: KiDocument['references']): KiReferenceGroup[] => {
  if (!Array.isArray(references)) {
    return [];
  }
  return REFERENCE_GROUP_ORDER.flatMap((relation) => {
    const items = references
      .filter(({ relation: itemRelation, uri }) => itemRelation === relation && Boolean(uri))
      .map(({ uri = '', description }): KiReferenceItem => {
        const kiId = kiIdFromUri(uri);
        const conversationId = conversationIdFromUri(uri);
        return {
          uri,
          ...(description ? { description } : {}),
          ...(kiId ? { kiId } : {}),
          ...(conversationId ? { conversationId } : {}),
        };
      })
      .filter(
        ({ kiId, conversationId }) =>
          relation !== 'derived_from' || kiId !== undefined || conversationId !== undefined
      );
    return items.length > 0 ? [{ relation, items }] : [];
  });
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
