/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObject } from '@kbn/core-saved-objects-common/src/server_types';
import type { DataCatalog } from '@kbn/data-catalog-plugin/server';
import type { DataSourceAttributes } from '../saved_objects';

export interface DataSourceAPIResponse {
  id: string;
  name: string;
  type: string;
  iconType: string;
  stackConnectors: string[];
  agentTools: string[];
  workflows: string[];
  createdAt?: string;
  updatedAt?: string;
}

export function convertSOtoAPIResponse(
  savedObject: SavedObject<DataSourceAttributes>,
  catalog: DataCatalog
): DataSourceAPIResponse {
  // Derive iconType from catalog based on data source type
  const dataSource = catalog.get(savedObject.attributes.type);
  const iconType = dataSource?.iconType ?? '.integration'; // Fallback to generic icon

  return {
    id: savedObject.id,
    name: savedObject.attributes.name,
    type: savedObject.attributes.type,
    iconType,
    stackConnectors: savedObject.attributes.kscIds,
    agentTools: savedObject.attributes.toolIds,
    workflows: savedObject.attributes.workflowIds,
    createdAt: savedObject.attributes.createdAt,
    updatedAt: savedObject.attributes.updatedAt,
  };
}

/**
 * Schema for credentials for a single connector
 */
const connectorCredentialsSchema = schema.object({
  /** The connector type (e.g., '.google_drive', '.jina') */
  connector_type: schema.string({ minLength: 1 }),
  /** The credentials (token, API key, etc.) for this connector */
  credentials: schema.maybe(schema.string({ minLength: 1 })),
  /** Optional: Use an existing stack connector ID instead of creating a new one */
  existing_connector_id: schema.maybe(schema.string({ minLength: 1 })),
});

export const createDataSourceRequestSchema = schema.object({
  /** The data source type (e.g., 'google_drive', 'notion') */
  type: schema.string({ minLength: 1 }),
  /** Display name for the data source */
  name: schema.maybe(schema.string({ minLength: 1 })),
  /**
   * Credentials for each connector required by this data source.
   * The array should match the stackConnectors defined in the data source definition.
   * Optional connectors can be omitted.
   */
  connector_credentials: schema.arrayOf(connectorCredentialsSchema),
});
