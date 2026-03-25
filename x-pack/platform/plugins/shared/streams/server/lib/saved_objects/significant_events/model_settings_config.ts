/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectModelTransformationDoc,
  SavedObjectModelUnsafeTransformFn,
} from '@kbn/core-saved-objects-server';
import type { SavedObjectsType } from '@kbn/core/server';
import { schema, type TypeOf } from '@kbn/config-schema';

export const STREAMS_SIGNIFICANT_EVENTS_SETTINGS_SO_TYPE = 'streams-significant-events-settings';

export type ConnectorSlotSource = 'user' | 'system';

export interface ConnectorSlot {
  id: string;
  source: ConnectorSlotSource;
}

export const CONNECTOR_SLOT_NAMES = [
  'kiFeatureExtractionConnector',
  'kiQueryGenerationConnector',
  'discoveryAndSigEventsConnector',
] as const;

export type ConnectorSlotName = (typeof CONNECTOR_SLOT_NAMES)[number];

const connectorSlotSchema = schema.maybe(
  schema.object({
    id: schema.string(),
    source: schema.oneOf([schema.literal('user'), schema.literal('system')]),
  })
);

export const streamsSignificantEventsSettingsSOAttributesV2 = schema.object({
  connectors: schema.maybe(
    schema.object({
      kiFeatureExtractionConnector: connectorSlotSchema,
      kiQueryGenerationConnector: connectorSlotSchema,
      discoveryAndSigEventsConnector: connectorSlotSchema,
    })
  ),
  indexPatterns: schema.maybe(schema.string()),
});

export type ModelSettingsConfigAttributes = TypeOf<
  typeof streamsSignificantEventsSettingsSOAttributesV2
>;

// Maps old flat field names (pre-model-version) to new slot names.
// Used only by the v0→v1 model version transform.
const FLAT_FIELD_TO_SLOT: Record<string, ConnectorSlotName> = {
  connectorIdKnowledgeIndicatorExtraction: 'kiFeatureExtractionConnector',
  connectorIdRuleGeneration: 'kiQueryGenerationConnector',
  connectorIdDiscovery: 'discoveryAndSigEventsConnector',
};

export const migrateV0ToV1: SavedObjectModelUnsafeTransformFn<
  Record<string, unknown>,
  ModelSettingsConfigAttributes
> = (doc) => {
  const { attributes } = doc;
  const connectors: Partial<Record<ConnectorSlotName, ConnectorSlot>> = {};

  for (const [flatField, slotName] of Object.entries(FLAT_FIELD_TO_SLOT)) {
    const value = attributes[flatField];
    if (typeof value === 'string' && value.trim() !== '') {
      connectors[slotName] = { id: value, source: 'system' };
    }
  }

  const newAttributes: ModelSettingsConfigAttributes = {
    indexPatterns:
      typeof attributes.indexPatterns === 'string' ? attributes.indexPatterns : undefined,
    ...(Object.keys(connectors).length > 0
      ? { connectors: connectors as NonNullable<ModelSettingsConfigAttributes['connectors']> }
      : {}),
  };

  return {
    document: {
      ...doc,
      attributes: newAttributes,
    } as SavedObjectModelTransformationDoc<ModelSettingsConfigAttributes>,
  };
};

const SINGLETON_ID = 'streams-significant-events-settings';

export const getStreamsSignificantEventsSettingsSavedObject = (): SavedObjectsType => {
  return {
    name: STREAMS_SIGNIFICANT_EVENTS_SETTINGS_SO_TYPE,
    hidden: false,
    namespaceType: 'multiple',
    mappings: {
      dynamic: false,
      properties: {},
    },
    modelVersions: {
      '1': {
        changes: [
          {
            type: 'unsafe_transform',
            transformFn: (typeSafeGuard) => typeSafeGuard(migrateV0ToV1),
          },
        ],
        schemas: {
          forwardCompatibility: streamsSignificantEventsSettingsSOAttributesV2.extends(
            {},
            { unknowns: 'ignore' }
          ),
          create: streamsSignificantEventsSettingsSOAttributesV2,
        },
      },
    },
    management: {
      importableAndExportable: true,
    },
  };
};

export const STREAMS_SIGNIFICANT_EVENTS_SETTINGS_SINGLETON_ID = SINGLETON_ID;
