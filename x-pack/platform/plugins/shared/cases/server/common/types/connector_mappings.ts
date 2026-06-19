/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import type { ConnectorMappingsAttributes } from '../../../common/types/domain';
import { ConnectorMappingsAttributesSchema } from '../../../common/types/domain';

export interface ConnectorMappingsPersistedAttributes {
  mappings: Array<{
    action_type: string;
    source: string;
    target: string;
  }>;
  owner: string;
}

export const ConnectorMappingsAttributesTransformedSchema = ConnectorMappingsAttributesSchema;

export type ConnectorMappingsAttributesTransformed = ConnectorMappingsAttributes;
export type ConnectorMappingsSavedObjectTransformed =
  SavedObject<ConnectorMappingsAttributesTransformed>;

export const ConnectorMappingsAttributesPartialSchema = ConnectorMappingsAttributesSchema.partial();
