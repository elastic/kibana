/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import { EngineDescriptorType } from './types';

const MODEL_VERSION_WITH_LOG_EXTRACTION_CONFIG = 8;

const modelVersion = (version: number): SavedObjectsModelVersion => {
  const modelVersions = EngineDescriptorType.modelVersions;
  if (typeof modelVersions !== 'object' || modelVersions === null) {
    throw new Error('EngineDescriptorType.modelVersions is not an object');
  }
  const found = (modelVersions as Record<number, SavedObjectsModelVersion>)[version];
  if (found === undefined) {
    throw new Error(`No model version ${version} registered`);
  }
  return found;
};

const createSchema = (version: number) => {
  const schema = modelVersion(version).schemas?.create;
  if (schema === undefined) {
    throw new Error(`Model version ${version} has no create schema`);
  }
  return schema;
};

const descriptor = (overrides: Record<string, unknown> = {}) => ({
  type: 'service',
  status: 'started',
  logExtractionState: {
    checkpointTimestamp: null,
    paginationId: null,
    lastExecutionTimestamp: null,
    sliceEndTimestamp: null,
  },
  error: null,
  versionState: {
    version: 2,
    state: 'running',
    isMigratedFromV1: false,
  },
  ...overrides,
});

describe('EngineDescriptorType model version 8', () => {
  const schema = createSchema(MODEL_VERSION_WITH_LOG_EXTRACTION_CONFIG);

  it('adds no data changes, so descriptors written by version 7 need no backfill', () => {
    expect(modelVersion(MODEL_VERSION_WITH_LOG_EXTRACTION_CONFIG).changes).toEqual([]);
  });

  it('accepts a descriptor with no logExtractionConfig, as written before this version', () => {
    expect(() => schema.validate(descriptor())).not.toThrow();
  });

  it('accepts an empty logExtractionConfig', () => {
    expect(() => schema.validate(descriptor({ logExtractionConfig: {} }))).not.toThrow();
  });

  it('accepts a partial logExtractionConfig', () => {
    expect(() =>
      schema.validate(descriptor({ logExtractionConfig: { frequency: '10m' } }))
    ).not.toThrow();
  });

  it('accepts null for a cleared logExtractionConfig field', () => {
    expect(() =>
      schema.validate(descriptor({ logExtractionConfig: { frequency: null, delay: null } }))
    ).not.toThrow();
  });

  it('accepts every overridable field at once', () => {
    expect(() =>
      schema.validate(
        descriptor({
          logExtractionConfig: {
            additionalIndexPatterns: ['logs-custom-*'],
            excludedIndexPatterns: ['logs-noisy-*'],
            lookbackPeriod: '6h',
            delay: '2m',
            docsLimit: 5000,
            maxLogsPerPage: 25000,
            frequency: '10m',
            maxTimeWindowSize: '30m',
            maxLogsPerWindow: 1000000,
            maxLogsPerWindowCapBehavior: 'defer',
          },
        })
      )
    ).not.toThrow();
  });

  it('rejects timeout and fieldHistoryLength, which are never read at runtime', () => {
    expect(() =>
      schema.validate(descriptor({ logExtractionConfig: { timeout: '59s' } }))
    ).toThrow();
    expect(() =>
      schema.validate(descriptor({ logExtractionConfig: { fieldHistoryLength: 10 } }))
    ).toThrow();
  });

  it('rejects a wrongly typed logExtractionConfig value', () => {
    expect(() =>
      schema.validate(descriptor({ logExtractionConfig: { docsLimit: 'not-a-number' } }))
    ).toThrow();
  });

  it('is rejected by the previous model version, which predates the field', () => {
    expect(() =>
      createSchema(MODEL_VERSION_WITH_LOG_EXTRACTION_CONFIG - 1).validate(
        descriptor({ logExtractionConfig: { frequency: '10m' } })
      )
    ).toThrow();
  });

  it('ignores unknown keys on the forward-compatibility schema', () => {
    const forwardCompatibility = modelVersion(MODEL_VERSION_WITH_LOG_EXTRACTION_CONFIG).schemas
      ?.forwardCompatibility;
    if (forwardCompatibility === undefined || typeof forwardCompatibility === 'function') {
      throw new Error('Expected a config-schema forwardCompatibility schema');
    }
    expect(() =>
      forwardCompatibility.validate(descriptor({ somethingFromTheFuture: true }))
    ).not.toThrow();
  });
});
