/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateExternalSourceData,
  FindExternalSourcesSortField,
  ExternalSourceResponse,
} from '@kbn/alerting-v2-schemas';
import type { SavedObjectReference } from '@kbn/core/server';
import {
  CONNECTOR_SAVED_OBJECT_TYPE,
  EXTERNAL_SOURCE_CONNECTOR_REFERENCE_NAME,
  type ExternalSourceSavedObjectAttributes,
} from '../../saved_objects';
import type { Actor } from '../services/user_service/user_service';

/** The fields of an external source that callers can set, without its id. */
export type ExternalSourceData = Omit<CreateExternalSourceData, 'id'>;

/** Builds the saved object references of an external source: one reference to its connector. */
export const buildExternalSourceReferences = (connectorId: string): SavedObjectReference[] => [
  {
    name: EXTERNAL_SOURCE_CONNECTOR_REFERENCE_NAME,
    type: CONNECTOR_SAVED_OBJECT_TYPE,
    id: connectorId,
  },
];

/** Returns the connector id held by an external source's `connector` reference, if it has one. */
export const getConnectorIdFromReferences = (
  references: SavedObjectReference[]
): string | undefined =>
  references.find(
    ({ name, type }) =>
      name === EXTERNAL_SOURCE_CONNECTOR_REFERENCE_NAME && type === CONNECTOR_SAVED_OBJECT_TYPE
  )?.id;

const toStoredMetadata = (
  metadata: ExternalSourceData['metadata']
): ExternalSourceSavedObjectAttributes['metadata'] => ({
  name: metadata.name,
  ...(metadata.description !== undefined ? { description: metadata.description } : {}),
  ...(metadata.tags !== undefined ? { tags: metadata.tags } : {}),
  ...(metadata.routing_tags !== undefined ? { routing_tags: metadata.routing_tags } : {}),
});

export const buildCreateExternalSourceAttributes = ({
  data,
  actor,
  now,
}: {
  data: ExternalSourceData;
  actor: Actor | null;
  now: string;
}): ExternalSourceSavedObjectAttributes => ({
  type: data.type,
  kind: data.kind,
  metadata: toStoredMetadata(data.metadata),
  connector_id: data.connector_id,
  version: 1,
  createdBy: actor,
  updatedBy: actor,
  createdAt: now,
  updatedAt: now,
});

export const buildUpdateExternalSourceAttributes = ({
  existing,
  data,
  actor,
  now,
}: {
  existing: ExternalSourceSavedObjectAttributes;
  data: ExternalSourceData;
  actor: Actor | null;
  now: string;
}): ExternalSourceSavedObjectAttributes => ({
  type: existing.type,
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
export const toExternalSourceData = (
  attributes: ExternalSourceSavedObjectAttributes,
  connectorId: string
): ExternalSourceData => ({
  type: attributes.type,
  kind: attributes.kind,
  metadata: toStoredMetadata(attributes.metadata),
  connector_id: connectorId,
});

export const transformExternalSourceToApiResponse = ({
  id,
  attributes,
  connectorId,
}: {
  id: string;
  attributes: ExternalSourceSavedObjectAttributes;
  connectorId: string;
}): ExternalSourceResponse => ({
  id,
  type: attributes.type,
  kind: attributes.kind,
  metadata: toStoredMetadata(attributes.metadata),
  connector_id: connectorId,
  version: attributes.version,
  created_by: attributes.createdBy,
  created_at: attributes.createdAt,
  updated_by: attributes.updatedBy,
  updated_at: attributes.updatedAt,
});

const SORT_FIELDS: Record<FindExternalSourcesSortField, string> = {
  name: 'metadata.name.keyword',
  kind: 'kind',
  type: 'type',
};

export const mapExternalSourceSortField = (
  sortField?: FindExternalSourcesSortField
): string | undefined => (sortField ? SORT_FIELDS[sortField] : undefined);
