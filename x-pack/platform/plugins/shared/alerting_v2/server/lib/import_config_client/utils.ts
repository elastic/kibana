/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateImportConfigData,
  FindImportConfigsSortField,
  ImportConfigResponse,
} from '@kbn/alerting-v2-schemas';
import type { SavedObjectReference } from '@kbn/core/server';
import {
  CONNECTOR_SAVED_OBJECT_TYPE,
  IMPORT_CONFIG_CONNECTOR_REFERENCE_NAME,
  type ImportConfigSavedObjectAttributes,
} from '../../saved_objects';
import type { Actor } from '../services/user_service/user_service';

/** The fields of an import config that callers can set, without its id. */
export type ImportConfigData = Omit<CreateImportConfigData, 'id'>;

/** Builds the saved object references of an import config: one reference to its connector. */
export const buildImportConfigReferences = (connectorId: string): SavedObjectReference[] => [
  {
    name: IMPORT_CONFIG_CONNECTOR_REFERENCE_NAME,
    type: CONNECTOR_SAVED_OBJECT_TYPE,
    id: connectorId,
  },
];

/** Returns the connector id held by an import config's `connector` reference, if it has one. */
export const getConnectorIdFromReferences = (
  references: SavedObjectReference[]
): string | undefined =>
  references.find(
    ({ name, type }) =>
      name === IMPORT_CONFIG_CONNECTOR_REFERENCE_NAME && type === CONNECTOR_SAVED_OBJECT_TYPE
  )?.id;

const toStoredMetadata = (
  metadata: ImportConfigData['metadata']
): ImportConfigSavedObjectAttributes['metadata'] => ({
  name: metadata.name,
  ...(metadata.description !== undefined ? { description: metadata.description } : {}),
  ...(metadata.tags !== undefined ? { tags: metadata.tags } : {}),
  ...(metadata.routing_tags !== undefined ? { routing_tags: metadata.routing_tags } : {}),
});

export const buildCreateImportConfigAttributes = ({
  data,
  actor,
  now,
}: {
  data: ImportConfigData;
  actor: Actor | null;
  now: string;
}): ImportConfigSavedObjectAttributes => ({
  kind: data.kind,
  metadata: toStoredMetadata(data.metadata),
  connector_id: data.connector_id,
  version: 1,
  createdBy: actor,
  updatedBy: actor,
  createdAt: now,
  updatedAt: now,
});

export const buildUpdateImportConfigAttributes = ({
  existing,
  data,
  actor,
  now,
}: {
  existing: ImportConfigSavedObjectAttributes;
  data: ImportConfigData;
  actor: Actor | null;
  now: string;
}): ImportConfigSavedObjectAttributes => ({
  kind: data.kind,
  metadata: toStoredMetadata(data.metadata),
  connector_id: data.connector_id,
  version: existing.version + 1,
  createdBy: existing.createdBy,
  updatedBy: actor,
  createdAt: existing.createdAt,
  updatedAt: now,
});

/** The stored fields a PATCH merges into, in the shape of the create data. */
export const toImportConfigData = (
  attributes: ImportConfigSavedObjectAttributes,
  connectorId: string
): ImportConfigData => ({
  kind: attributes.kind,
  metadata: toStoredMetadata(attributes.metadata),
  connector_id: connectorId,
});

export const transformImportConfigToApiResponse = ({
  id,
  attributes,
  connectorId,
}: {
  id: string;
  attributes: ImportConfigSavedObjectAttributes;
  connectorId: string;
}): ImportConfigResponse => ({
  id,
  kind: attributes.kind,
  metadata: toStoredMetadata(attributes.metadata),
  connector_id: connectorId,
  version: attributes.version,
  created_by: attributes.createdBy,
  created_at: attributes.createdAt,
  updated_by: attributes.updatedBy,
  updated_at: attributes.updatedAt,
});

const SORT_FIELDS: Record<FindImportConfigsSortField, string> = {
  name: 'metadata.name.keyword',
  kind: 'kind',
};

export const mapImportConfigSortField = (
  sortField?: FindImportConfigsSortField
): string | undefined => (sortField ? SORT_FIELDS[sortField] : undefined);
