/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { BaseFeature, Feature } from '@kbn/significant-events-schema';
import { reconcileInferredFeatures } from './reconcile_features';

const RUN_ID = 'run-1';
const logger = loggingSystemMock.createLogger();

const createStoredFeature = ({
  id,
  ...overrides
}: Partial<Feature> & Pick<Feature, 'id'>): Feature => ({
  id,
  uuid: `uuid-${overrides.type ?? 'technology'}-${id}`,
  stream_name: 'logs.test',
  type: 'technology',
  subtype: 'library',
  title: id,
  description: id,
  properties: { name: id },
  confidence: 80,
  updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const createRawFeature = ({
  id,
  ...overrides
}: Partial<BaseFeature> & Pick<BaseFeature, 'id'>): BaseFeature => ({
  id,
  stream_name: 'logs.test',
  type: 'technology',
  subtype: 'library',
  title: id,
  description: id,
  properties: { name: id },
  confidence: 80,
  ...overrides,
});

const reconcile = (overrides: Partial<Parameters<typeof reconcileInferredFeatures>[0]> = {}) =>
  reconcileInferredFeatures({
    rawFeatures: [],
    allKnownFeatures: [],
    discoveredFeatures: [],
    ignoredFeatures: [],
    excludedFeatures: [],
    runId: RUN_ID,
    logger,
    ...overrides,
  });

describe('reconcileInferredFeatures', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adopts the existing identity when a fingerprint matches', () => {
    const existing = createStoredFeature({
      id: 'java',
      properties: { language: 'java' },
    });
    const raw = createRawFeature({
      id: 'java-runtime',
      properties: { language: 'java' },
    });

    const result = reconcile({
      rawFeatures: [raw],
      allKnownFeatures: [existing],
    });

    expect(result.newFeatures).toEqual([]);
    expect(result.updatedFeatures).toHaveLength(1);
    expect(result.updatedFeatures[0].id).toBe('java');
    expect(result.remappedCount).toBe(1);
  });

  it('remaps versioned ids and records version history', () => {
    const existing = createStoredFeature({
      id: 'okta',
      properties: { name: 'okta', version: '3.14.1' },
    });
    const raw = createRawFeature({
      id: 'okta-3.15.0',
      properties: { name: 'okta', version: '3.15.0' },
    });

    const result = reconcile({
      rawFeatures: [raw],
      allKnownFeatures: [existing],
    });

    expect(result.updatedFeatures[0]).toEqual(
      expect.objectContaining({
        id: 'okta',
        properties: { name: 'okta', version: '3.15.0' },
        meta: { version_history: ['3.14.1'] },
      })
    );
    expect(result.remappedCount).toBe(1);
  });

  it('matches a safely validated alias before falling back to fingerprints', () => {
    const existing = createStoredFeature({
      id: 'opentelemetry',
      properties: { name: 'opentelemetry' },
      meta: { aliases: ['otel'] },
    });
    const raw = createRawFeature({
      id: 'otel',
      properties: { name: 'otel' },
    });

    const result = reconcile({
      rawFeatures: [raw],
      allKnownFeatures: [existing],
    });

    expect(result.updatedFeatures[0].id).toBe('opentelemetry');
    expect(result.remappedCount).toBe(1);
  });

  it('picks the most recently updated candidate for a normalized match', () => {
    const older = createStoredFeature({
      id: 'okta-3.14.1',
      properties: { name: 'okta', version: '3.14.1' },
      updated_at: '2026-01-01T00:00:00.000Z',
    });
    const newer = createStoredFeature({
      id: 'okta-3.15.0',
      properties: { name: 'okta', version: '3.15.0' },
      updated_at: '2026-02-01T00:00:00.000Z',
    });

    const result = reconcile({
      rawFeatures: [
        createRawFeature({
          id: 'okta-3.16.0',
          properties: { name: 'okta', version: '3.16.0' },
        }),
      ],
      allKnownFeatures: [older, newer],
    });

    expect(result.updatedFeatures[0].id).toBe('okta-3.15.0');
  });

  it('does not merge exact or normalized ids across feature types', () => {
    const entity = createStoredFeature({
      id: 'gcp',
      type: 'entity',
      subtype: 'cloud_service',
      properties: { name: 'gcp' },
    });
    const infrastructure = createStoredFeature({
      id: 'gcp',
      type: 'infrastructure',
      subtype: 'cloud_deployment',
      properties: { provider: 'gcp' },
    });
    const rawInfrastructure = createRawFeature({
      id: 'gcp-1.2.3',
      type: 'infrastructure',
      subtype: 'cloud_deployment',
      properties: { provider: 'gcp', version: '1.2.3' },
    });
    const rawTechnology = createRawFeature({
      id: 'gcp',
      type: 'technology',
      subtype: 'sdk',
      properties: { name: 'gcp' },
    });

    const result = reconcile({
      rawFeatures: [rawInfrastructure, rawTechnology],
      allKnownFeatures: [entity, infrastructure],
    });

    expect(result.updatedFeatures).toHaveLength(1);
    expect(result.updatedFeatures[0]).toEqual(
      expect.objectContaining({ id: 'gcp', type: 'infrastructure' })
    );
    expect(result.newFeatures).toEqual([
      expect.objectContaining({ id: 'gcp', type: 'technology' }),
    ]);
  });

  it('does not strip or merge short numeric infrastructure suffixes', () => {
    const firstSlice = createStoredFeature({
      id: 'production-noncanary-ds-1',
      type: 'infrastructure',
      subtype: 'deployment_slice',
      properties: { name: 'production-noncanary-ds-1' },
    });
    const secondSlice = createRawFeature({
      id: 'production-noncanary-ds-2',
      type: 'infrastructure',
      subtype: 'deployment_slice',
      properties: { name: 'production-noncanary-ds-2' },
    });

    const result = reconcile({
      rawFeatures: [secondSlice],
      allKnownFeatures: [firstSlice],
    });

    expect(result.updatedFeatures).toEqual([]);
    expect(result.newFeatures[0].id).toBe('production-noncanary-ds-2');
    expect(result.remappedCount).toBe(0);
  });

  it.each([{ aliases: 'candidate' }, { aliases: { candidate: true } }])(
    'ignores malformed aliases without throwing',
    (meta) => {
      const result = reconcile({
        rawFeatures: [
          createRawFeature({
            id: 'candidate',
            properties: { name: 'candidate' },
          }),
        ],
        allKnownFeatures: [
          createStoredFeature({
            id: 'canonical',
            properties: { name: 'canonical' },
            meta,
          }),
        ],
      });

      expect(result.newFeatures[0].id).toBe('candidate');
      expect(result.remappedCount).toBe(0);
    }
  );

  it('records version history for an exact-id match from a previous run', () => {
    const existing = createStoredFeature({
      id: 'okta',
      properties: { name: 'okta', version: '3.14.1' },
      meta: { aliases: ['old-okta'] },
      run_id: 'previous-run',
    });
    const raw = createRawFeature({
      id: 'okta',
      properties: { name: 'okta', version: '3.15.0' },
      meta: { aliases: ['new-okta'] },
    });

    const result = reconcile({
      rawFeatures: [raw],
      allKnownFeatures: [existing],
      discoveredFeatures: [],
    });

    expect(result.updatedFeatures[0].meta?.version_history).toEqual(['3.14.1']);
    expect(result.updatedFeatures[0].meta?.aliases).toEqual(['old-okta', 'new-okta']);
    expect(result.remappedCount).toBe(0);
  });

  it('skips an unchanged feature already discovered in this run', () => {
    const existing = createStoredFeature({ id: 'okta', run_id: RUN_ID });
    const raw = createRawFeature({ id: 'okta' });

    const result = reconcile({
      rawFeatures: [raw],
      allKnownFeatures: [existing],
      discoveredFeatures: [existing],
    });

    expect(result.updatedFeatures).toEqual([]);
  });

  it('keeps excluded-feature filtering unchanged', () => {
    const excluded = createStoredFeature({ id: 'okta', excluded: true });

    const result = reconcile({
      rawFeatures: [createRawFeature({ id: 'okta' })],
      excludedFeatures: [excluded],
    });

    expect(result.newFeatures).toEqual([]);
    expect(result.updatedFeatures).toEqual([]);
    expect(result.codeIgnoredCount).toBe(1);
  });
});
