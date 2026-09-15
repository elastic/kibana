/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core/server';
import type { EncryptedSavedObjectTypeRegistration } from '@kbn/encrypted-saved-objects-plugin/server';
import type { StreamsUnit } from '@kbn/streams-schema';
import {
  STREAMS_CONFIGURATION_SAVED_OBJECT_TYPE,
  STREAMS_UI_METADATA_SAVED_OBJECT_TYPE,
} from '../../../common/constants';

// Partial SO schema: per-type component fields and UI metadata are validated
// by streams-schema / the distributor, not duplicated here.
const yamlCompatibleObject = schema.object({}, { unknowns: 'allow' });
const unitComponentsSchema = schema.arrayOf(yamlCompatibleObject, { maxSize: 2000 });

export const STREAMS_CONFIGURATION_ATTRIBUTES_TO_ENCRYPT = ['secrets'] as const;
export const STREAMS_CONFIGURATION_ATTRIBUTES_IN_AAD = ['unit_id'] as const;

export const streamsConfigurationSavedObjectAttributesV1 = schema.object({
  unit_id: schema.string({ maxLength: 256 }),
  unit: schema.object({
    sources: schema.maybe(unitComponentsSchema),
    processors: schema.maybe(unitComponentsSchema),
    destinations: schema.maybe(unitComponentsSchema),
  }),
  // Encrypted at rest as a string. Decrypted `secrets` is a name → value map.
  // Do not map it; do not include `unit` in AAD (canvas edits would re-encrypt).
  secrets: schema.string({ defaultValue: '{}' }),
});

export const streamsConfigurationEncryptedType: EncryptedSavedObjectTypeRegistration = {
  type: STREAMS_CONFIGURATION_SAVED_OBJECT_TYPE,
  attributesToEncrypt: new Set(STREAMS_CONFIGURATION_ATTRIBUTES_TO_ENCRYPT),
  attributesToIncludeInAAD: new Set(STREAMS_CONFIGURATION_ATTRIBUTES_IN_AAD),
  // Document id is the unit id (`default` in v1).
  enforceRandomId: false,
};

export type StreamsConfigurationSavedObjectAttributes =
  StreamsUnit.ConfigurationSavedObjectAttributes;

export const streamsUiMetadataSavedObjectAttributesV1 = schema.object({
  metadata: yamlCompatibleObject,
});

export type StreamsUiMetadataSavedObjectAttributes = StreamsUnit.UiMetadataSavedObjectAttributes;

export const streamsConfigurationSavedObjectType: SavedObjectsType<StreamsConfigurationSavedObjectAttributes> =
  {
    name: STREAMS_CONFIGURATION_SAVED_OBJECT_TYPE,
    hidden: true,
    hiddenFromHttpApis: true,
    namespaceType: 'multiple-isolated',
    mappings: {
      dynamic: false,
      properties: {
        unit_id: { type: 'keyword' },
      },
    },
    management: {
      importableAndExportable: false,
    },
    modelVersions: {
      '1': {
        changes: [],
        schemas: {
          forwardCompatibility: streamsConfigurationSavedObjectAttributesV1.extends(
            {},
            { unknowns: 'ignore' }
          ),
          create: streamsConfigurationSavedObjectAttributesV1,
        },
      },
    },
  };

export const streamsUiMetadataSavedObjectType: SavedObjectsType<StreamsUiMetadataSavedObjectAttributes> =
  {
    name: STREAMS_UI_METADATA_SAVED_OBJECT_TYPE,
    hidden: true,
    hiddenFromHttpApis: true,
    namespaceType: 'multiple-isolated',
    mappings: {
      dynamic: false,
      properties: {},
    },
    management: {
      importableAndExportable: false,
    },
    modelVersions: {
      '1': {
        changes: [],
        schemas: {
          forwardCompatibility: streamsUiMetadataSavedObjectAttributesV1.extends(
            {},
            { unknowns: 'ignore' }
          ),
          create: streamsUiMetadataSavedObjectAttributesV1,
        },
      },
    },
  };
