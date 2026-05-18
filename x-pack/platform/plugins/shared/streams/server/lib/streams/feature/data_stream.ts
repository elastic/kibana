/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataStreamDefinition } from '@kbn/data-streams';
import type { MappingsDefinition } from '@kbn/es-mappings';

export const FEATURES_DATA_STREAM = '.significant_events-features';

// The index template mappings sent to Elasticsearch. Properties with types not
// modelled by @kbn/es-mappings (semantic_text, enabled:false objects) are cast
// to avoid type errors; the runtime shape is correct.
const featuresMappings = {
  dynamic: false,
  properties: {
    '@timestamp': { type: 'date', format: 'strict_date_optional_time' },
    'stream.name': { type: 'keyword', ignore_above: 1024 },
    'feature.id': { type: 'keyword', ignore_above: 1024 },
    'feature.type': { type: 'keyword', ignore_above: 1024 },
    'feature.subtype': { type: 'keyword', ignore_above: 1024 },
    'feature.title': {
      type: 'text',
      fields: { keyword: { type: 'keyword', ignore_above: 1024 } },
    },
    'feature.description': { type: 'text' },
    'feature.properties': { type: 'object', enabled: false },
    'feature.confidence': { type: 'long' },
    'feature.evidence': { type: 'keyword', ignore_above: 1024 },
    'feature.evidence_doc_ids': { type: 'keyword', ignore_above: 1024 },
    'feature.tags': { type: 'keyword', ignore_above: 1024 },
    'feature.meta': { type: 'object', enabled: false },
    'feature.filter': { type: 'object', enabled: false },
    'feature.run_id': { type: 'keyword', ignore_above: 1024 },
    'feature.deleted': { type: 'boolean' },
    // semantic_text is not in @kbn/es-mappings supported types; cast is intentional
    'feature.search_embedding': { type: 'semantic_text' },
  },
} as unknown as MappingsDefinition;

// Document shape for reads (ES|QL _source) and writes (dataStreamClient.create).
// The index signature is required by IDataStreamClient generic constraints.
export interface StoredFeatureDoc {
  [key: string]:
    | string
    | number
    | boolean
    | string[]
    | Record<string, unknown>
    | Record<string, unknown>[]
    | undefined;
  '@timestamp'?: string;
  'stream.name'?: string;
  'feature.id'?: string;
  'feature.type'?: string;
  'feature.subtype'?: string;
  'feature.title'?: string;
  'feature.description'?: string;
  'feature.properties'?: Record<string, unknown>;
  'feature.confidence'?: number;
  'feature.evidence'?: string[];
  'feature.evidence_doc_ids'?: string[];
  'feature.tags'?: string[];
  'feature.meta'?: Record<string, unknown>;
  'feature.filter'?: Record<string, unknown>;
  'feature.run_id'?: string;
  'feature.deleted'?: boolean;
  'feature.search_embedding'?: string;
}

export const featuresDataStream: DataStreamDefinition<MappingsDefinition, StoredFeatureDoc> = {
  name: FEATURES_DATA_STREAM,
  version: 1,
  hidden: true,
  template: {
    priority: 500,
    lifecycle: { data_retention: '90d' },
    mappings: featuresMappings,
  },
};
