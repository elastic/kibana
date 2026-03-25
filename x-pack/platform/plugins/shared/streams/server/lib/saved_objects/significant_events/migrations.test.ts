/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectModelTransformationContext,
  SavedObjectModelTransformationDoc,
} from '@kbn/core-saved-objects-server';
import { migrateV0ToV1 } from './model_settings_config';

const makeDoc = (
  attributes: Record<string, unknown>
): SavedObjectModelTransformationDoc<Record<string, unknown>> => ({
  id: 'singleton',
  type: 'streams-significant-events-settings',
  attributes,
  references: [],
});

const testContext: SavedObjectModelTransformationContext = {
  log: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  modelVersion: 1,
  namespaceType: 'multiple',
};

describe('model version 1 transform (v0 → v1)', () => {
  it('migrates all flat connector fields to nested connectors with source: system', () => {
    const doc = makeDoc({
      connectorIdKnowledgeIndicatorExtraction: 'conn-1',
      connectorIdRuleGeneration: 'conn-2',
      connectorIdDiscovery: 'conn-3',
      indexPatterns: 'logs-*',
    });

    const { document: result } = migrateV0ToV1(doc, testContext);

    expect(result.attributes.connectors).toEqual({
      kiFeatureExtractionConnector: { id: 'conn-1', source: 'system' },
      kiQueryGenerationConnector: { id: 'conn-2', source: 'system' },
      discoveryAndSigEventsConnector: { id: 'conn-3', source: 'system' },
    });
    expect(result.attributes.indexPatterns).toBe('logs-*');
    expect(result.attributes).not.toHaveProperty('connectorIdKnowledgeIndicatorExtraction');
    expect(result.attributes).not.toHaveProperty('connectorIdRuleGeneration');
    expect(result.attributes).not.toHaveProperty('connectorIdDiscovery');
  });

  it('omits connectors key entirely when no flat fields are present', () => {
    const doc = makeDoc({ indexPatterns: 'metrics-*' });

    const { document: result } = migrateV0ToV1(doc, testContext);

    expect(result.attributes).toEqual({ indexPatterns: 'metrics-*' });
    expect(result.attributes).not.toHaveProperty('connectors');
  });

  it('treats undefined flat fields the same as missing', () => {
    const doc = makeDoc({
      connectorIdKnowledgeIndicatorExtraction: undefined,
      connectorIdRuleGeneration: undefined,
      connectorIdDiscovery: undefined,
    });

    const { document: result } = migrateV0ToV1(doc, testContext);

    expect(result.attributes).toEqual({});
    expect(result.attributes).not.toHaveProperty('connectors');
  });

  it('migrates only the flat fields that are present', () => {
    const doc = makeDoc({
      connectorIdKnowledgeIndicatorExtraction: 'conn-1',
      indexPatterns: 'logs-*',
    });

    const { document: result } = migrateV0ToV1(doc, testContext);

    expect(result.attributes.connectors).toEqual({
      kiFeatureExtractionConnector: { id: 'conn-1', source: 'system' },
    });
    expect(result.attributes.indexPatterns).toBe('logs-*');
  });

  it('skips empty-string flat fields', () => {
    const doc = makeDoc({
      connectorIdKnowledgeIndicatorExtraction: '',
      connectorIdRuleGeneration: '  ',
      connectorIdDiscovery: 'conn-3',
    });

    const { document: result } = migrateV0ToV1(doc, testContext);

    expect(result.attributes.connectors).toEqual({
      discoveryAndSigEventsConnector: { id: 'conn-3', source: 'system' },
    });
  });

  it('handles a completely empty attributes object', () => {
    const doc = makeDoc({});

    const { document: result } = migrateV0ToV1(doc, testContext);

    expect(result.attributes).toEqual({});
  });

  it('preserves doc id and type', () => {
    const doc = makeDoc({ connectorIdDiscovery: 'conn-3' });

    const { document: result } = migrateV0ToV1(doc, testContext);

    expect(result.id).toBe('singleton');
    expect(result.type).toBe('streams-significant-events-settings');
  });
});
