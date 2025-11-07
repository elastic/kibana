/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { getSegments } from '@kbn/streams-schema';
import {
  baseFields as logsBaseFields,
  baseMappings as logsBaseMappings,
  logsSettings,
  otelEquivalentLookupMap,
} from './component_templates/logs_layer';
import {
  baseFields as alertsBaseFields,
  baseMappings as alertsBaseMappings,
  baseSettings as alertsBaseSettings,
  otelEquivalentLookupMap as alertsOtelEquivalentLookupMap,
} from './component_templates/alerts_layer';

export const LOGS_ROOT_STREAM_NAME = 'logs';
export const ALERTS_ROOT_STREAM_NAME = 'alerts';

export const logsRootStreamDefinition: Streams.WiredStream.Definition = {
  name: LOGS_ROOT_STREAM_NAME,
  description: 'Root stream for logs',
  baseSettings: logsSettings,
  baseMappings: logsBaseMappings,
  otelEquivalentLookupMap,
  ingest: {
    lifecycle: { dsl: {} },
    settings: {},
    processing: { steps: [] },
    wired: {
      routing: [],
      fields: {
        ...logsBaseFields,
      },
    },
  },
};

export const alertsRootStreamDefinition: Streams.WiredStream.Definition = {
  name: ALERTS_ROOT_STREAM_NAME,
  description: 'Root stream for alerts',
  baseSettings: alertsBaseSettings,
  baseMappings: alertsBaseMappings,
  otelEquivalentLookupMap: alertsOtelEquivalentLookupMap,
  ingest: {
    lifecycle: { dsl: {} },
    settings: {},
    processing: { steps: [] },
    wired: {
      routing: [],
      fields: {
        ...alertsBaseFields,
      },
    },
  },
};

export const ROOT_STREAM_DEFINITIONS = [logsRootStreamDefinition, alertsRootStreamDefinition];

export function hasSupportedStreamsRoot(streamName: string) {
  const root = getSegments(streamName)[0];
  return [LOGS_ROOT_STREAM_NAME, ALERTS_ROOT_STREAM_NAME].includes(root);
}
