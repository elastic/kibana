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

export const createDataSourceRequestSchema = schema.object({
  type: schema.string({ minLength: 1 }),
  name: schema.maybe(schema.string({ minLength: 1 })),
  credentials: schema.maybe(schema.string({ minLength: 1 })),
  stack_connector_id: schema.maybe(schema.string({ minLength: 1 })),
});
