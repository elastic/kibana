/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core/server';
import type { StreamsGraph } from '@kbn/streams-schema';
import {
  STREAMS_CONFIGURATION_SAVED_OBJECT_TYPE,
  STREAMS_UI_METADATA_SAVED_OBJECT_TYPE,
} from '../../../common/constants';

const yamlCompatibleObject = schema.object({}, { unknowns: 'allow' });
const graphNodesSchema = schema.arrayOf(yamlCompatibleObject, { maxSize: 2000 });

export const streamsConfigurationSavedObjectAttributesV1 = schema.object({
  sources: graphNodesSchema,
  pipeline_definitions: graphNodesSchema,
  pipelines: graphNodesSchema,
  routing_nodes: graphNodesSchema,
  destinations: graphNodesSchema,
});

export type StreamsConfigurationSavedObjectAttributes =
  StreamsGraph.ConfigurationSavedObjectAttributes;

export const streamsUiMetadataSavedObjectAttributesV1 = schema.object({
  metadata: yamlCompatibleObject,
});

export type StreamsUiMetadataSavedObjectAttributes = StreamsGraph.UiMetadataSavedObjectAttributes;

export const streamsConfigurationSavedObjectType: SavedObjectsType<StreamsConfigurationSavedObjectAttributes> =
  {
    name: STREAMS_CONFIGURATION_SAVED_OBJECT_TYPE,
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
