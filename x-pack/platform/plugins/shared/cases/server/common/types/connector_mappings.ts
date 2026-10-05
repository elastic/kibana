/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import type {
  ConnectorMappingsAttributes,
  ExternalSyncFieldMapping,
  ExternalSyncFieldRule,
  ExternalSyncSettings,
} from '../../../common/types/domain';
import {
  ConnectorMappingsAttributesPartialRt,
  ConnectorMappingsAttributesRt,
} from '../../../common/types/domain';

export interface ConnectorMappingsPersistedAttributes {
  mappings: Array<{
    action_type: string;
    source: string;
    target: string;
  }>;
  owner: string;
  externalSync?: ExternalSyncSettings;
  externalSyncFields?: ExternalSyncFieldRule[];
  externalSyncFieldMappings?: ExternalSyncFieldMapping[];
}

export const ConnectorMappingsAttributesTransformedRt = ConnectorMappingsAttributesRt;

export type ConnectorMappingsAttributesTransformed = ConnectorMappingsAttributes;
export type ConnectorMappingsSavedObjectTransformed =
  SavedObject<ConnectorMappingsAttributesTransformed>;

export { ConnectorMappingsAttributesPartialRt };
