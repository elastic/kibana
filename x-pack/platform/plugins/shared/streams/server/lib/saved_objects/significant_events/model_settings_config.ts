/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { schema, type TypeOf } from '@kbn/config-schema';

export const STREAMS_SIGNIFICANT_EVENTS_SETTINGS_SO_TYPE = 'streams-significant-events-settings';

export const streamsSignificantEventsSettingsSOAttributesV1 = schema.object({
  connectorIdKnowledgeIndicatorExtraction: schema.maybe(schema.string()),
  connectorIdRuleGeneration: schema.maybe(schema.string()),
  connectorIdDiscovery: schema.maybe(schema.string()),
});

export type ModelSettingsConfigAttributes = TypeOf<
  typeof streamsSignificantEventsSettingsSOAttributesV1
>;

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
    management: {
      importableAndExportable: true,
    },
  };
};

export const STREAMS_SIGNIFICANT_EVENTS_SETTINGS_SINGLETON_ID = SINGLETON_ID;
