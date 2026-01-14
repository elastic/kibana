/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObject } from '@kbn/core-saved-objects-common/src/server_types';
import type { DataConnectorAttributes } from '../saved_objects';

export interface DataConnectorAPIResponse {
  id: string;
  name: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  stackConnectors: string[];
  agentTools: string[];
  workflows: string[];
}

export function convertSOtoAPIResponse(
  savedObject: SavedObject<DataConnectorAttributes>
): DataConnectorAPIResponse {
  return {
    id: savedObject.id,
    name: savedObject.attributes.name,
    type: savedObject.attributes.type,
    createdAt: savedObject.attributes.createdAt,
    updatedAt: savedObject.attributes.updatedAt,
    stackConnectors: savedObject.attributes.kscIds,
    agentTools: savedObject.attributes.toolIds,
    workflows: savedObject.attributes.workflowIds,
  };
}

export const createDataConnectorRequestSchema = schema.object({
  type: schema.string({ minLength: 1 }),
  name: schema.string({ minLength: 1 }),
  credentials: schema.string({ minLength: 1 }), // in the future, this can be either token or username:password
});
