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

    expect(result.updatedFeatures).toHaveLength(1);
    expect(result.updatedFeatures[0]).toEqual(
      expect.objectContaining({
        id: 'okta',
        properties: { name: 'okta', version: '3.15.0' },
        meta: { version_history: ['3.14.1'] },
      })
    );
    expect(result.remappedCount).toBe(1);
  });

  it('remaps a stored alias to its canonical id', () => {
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

    expect(result.updatedFeatures).toHaveLength(1);
    expect(result.updatedFeatures[0].id).toBe('opentelemetry');
    expect(result.remappedCount).toBe(1);
  });

  it.each([
    {
      precedence: 'exact ids over aliases',
      raw: createRawFeature({ id: 'otel', properties: { source: 'raw' } }),
      known: [
        createStoredFeature({ id: 'otel', properties: { source: 'exact' } }),
        createStoredFeature({
          id: 'opentelemetry',
          properties: { source: 'alias' },
          meta: { aliases: ['otel'] },
        }),
      ],
      expectedId: 'otel',
      expectedRemappedCount: 0,
    },
    {
      precedence: 'aliases over normalized ids',
      raw: createRawFeature({ id: 'okta-3.15.0', properties: { source: 'raw' } }),
      known: [
        createStoredFeature({
          id: 'okta-canonical',
          properties: { source: 'alias' },
          meta: { aliases: ['okta-3.15.0'] },
        }),
        createStoredFeature({ id: 'okta', properties: { source: 'normalized' } }),
      ],
      expectedId: 'okta-canonical',
      expectedRemappedCount: 1,
    },
    {
      precedence: 'normalized ids over fingerprints',
      raw: createRawFeature({ id: 'java-1.2.3', properties: { language: 'java' } }),
      known: [
        createStoredFeature({ id: 'java', properties: { source: 'normalized' } }),
        createStoredFeature({ id: 'jvm', properties: { language: 'java' } }),
      ],
      expectedId: 'java',
      expectedRemappedCount: 1,
    },
  ])('prefers $precedence', ({ raw, known, expectedId, expectedRemappedCount }) => {
    const result = reconcile({
      rawFeatures: [raw],
      allKnownFeatures: known,
    });

    expect(result.updatedFeatures).toHaveLength(1);
    expect(result.updatedFeatures[0].id).toBe(expectedId);
    expect(result.remappedCount).toBe(expectedRemappedCount);
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

    expect(result.updatedFeatures).toHaveLength(1);
    expect(result.updatedFeatures[0].id).toBe('okta-3.15.0');
    expect(result.remappedCount).toBe(1);
  });

  it('treats an exact slug as the same stored identity across feature types', () => {
    const existing = createStoredFeature({
      id: 'gcp',
      type: 'infrastructure',
      subtype: 'cloud_deployment',
      properties: { provider: 'gcp' },
    });
    const raw = createRawFeature({
      id: 'gcp',
      type: 'technology',
      subtype: 'sdk',
      properties: { name: 'gcp' },
    });

    const result = reconcile({
      rawFeatures: [raw],
      allKnownFeatures: [existing],
    });

    expect(result.newFeatures).toEqual([]);
    expect(result.updatedFeatures).toHaveLength(1);
    expect(result.updatedFeatures[0]).toEqual(
      expect.objectContaining({ id: 'gcp', type: 'infrastructure' })
    );
    expect(result.remappedCount).toBe(0);
  });

  it('does not normalize ids across feature types', () => {
    const existing = createStoredFeature({
      id: 'gcp',
      type: 'infrastructure',
      subtype: 'cloud_deployment',
      properties: { provider: 'gcp' },
    });
    const raw = createRawFeature({
      id: 'gcp-1.2.3',
      type: 'technology',
      subtype: 'sdk',
      properties: { name: 'gcp', version: '1.2.3' },
    });

    const result = reconcile({
      rawFeatures: [raw],
      allKnownFeatures: [existing],
    });

    expect(result.updatedFeatures).toEqual([]);
    expect(result.newFeatures).toEqual([
      expect.objectContaining({ id: 'gcp-1.2.3', type: 'technology' }),
    ]);
    expect(result.remappedCount).toBe(0);
  });

  it('folds multiple raw matches into one existing feature update', () => {
    const existing = createStoredFeature({
      id: 'okta',
      properties: { name: 'okta', version: '3.14.1' },
      evidence: ['existing evidence'],
    });
    const rawFeatures = [
      createRawFeature({
        id: 'okta-3.15.0',
        properties: { name: 'okta', version: '3.15.0' },
        evidence: ['3.15 evidence'],
      }),
      createRawFeature({
        id: 'okta-3.16.0',
        properties: { name: 'okta', version: '3.16.0' },
        evidence: ['3.16 evidence'],
      }),
    ];

    const result = reconcile({
      rawFeatures,
      allKnownFeatures: [existing],
    });

    expect(result.newFeatures).toEqual([]);
    expect(result.updatedFeatures).toEqual([
      expect.objectContaining({
        id: 'okta',
        properties: { name: 'okta', version: '3.16.0' },
        evidence: ['existing evidence', '3.15 evidence', '3.16 evidence'],
        meta: { version_history: ['3.14.1', '3.15.0'] },
      }),
    ]);
    expect(result.remappedCount).toBe(2);
  });

  it('folds duplicate new features before writing', () => {
    const rawFeatures = [
      createRawFeature({
        id: 'java-runtime',
        properties: { language: 'java' },
        evidence: ['runtime evidence'],
      }),
      createRawFeature({
        id: 'jvm',
        properties: { language: 'java' },
        evidence: ['jvm evidence'],
      }),
    ];

    const result = reconcile({ rawFeatures });

    expect(result.updatedFeatures).toEqual([]);
    expect(result.newFeatures).toEqual([
      expect.objectContaining({
        id: 'java-runtime',
        evidence: ['runtime evidence', 'jvm evidence'],
      }),
    ]);
    expect(result.remappedCount).toBe(1);
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

  it('routes an exact hit on a versioned sibling to the family survivor', () => {
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
    // Verbatim re-emission of a legacy versioned id must land on the survivor, not reset the sibling's TTL.
    const raw = createRawFeature({
      id: 'okta-3.14.1',
      properties: { name: 'okta', version: '3.14.1' },
    });

    const result = reconcile({
      rawFeatures: [raw],
      allKnownFeatures: [older, newer],
    });

    expect(result.newFeatures).toEqual([]);
    expect(result.updatedFeatures).toHaveLength(1);
    expect(result.updatedFeatures[0].id).toBe('okta-3.15.0');
    expect(result.remappedCount).toBe(1);
  });

  it('prefers an unversioned family member as survivor over a newer versioned sibling', () => {
    const unversioned = createStoredFeature({
      id: 'okta',
      properties: { name: 'okta', version: '3.15.0' },
      updated_at: '2026-01-01T00:00:00.000Z',
    });
    const versioned = createStoredFeature({
      id: 'okta-3.15.0',
      properties: { name: 'okta', version: '3.15.0' },
      updated_at: '2026-02-01T00:00:00.000Z',
    });
    const raw = createRawFeature({
      id: 'okta-3.15.0',
      properties: { name: 'okta', version: '3.15.0' },
    });

    const result = reconcile({
      rawFeatures: [raw],
      allKnownFeatures: [unversioned, versioned],
    });

    expect(result.newFeatures).toEqual([]);
    expect(result.updatedFeatures).toHaveLength(1);
    expect(result.updatedFeatures[0].id).toBe('okta');
    expect(result.remappedCount).toBe(1);
  });

  it('does not route across families with the same base name but different types', () => {
    const technology = createStoredFeature({
      id: 'kafka-3.7.0',
      type: 'technology',
      properties: { name: 'kafka', version: '3.7.0' },
    });
    const entity = createStoredFeature({
      id: 'kafka-cluster-1.2',
      type: 'entity',
      subtype: 'service',
      properties: { name: 'kafka-cluster' },
    });
    const raw = createRawFeature({
      id: 'kafka-3.7.0',
      type: 'technology',
      properties: { name: 'kafka', version: '3.7.0' },
    });

    const result = reconcile({
      rawFeatures: [raw],
      allKnownFeatures: [technology, entity],
    });

    expect(result.updatedFeatures).toHaveLength(1);
    expect(result.updatedFeatures[0].id).toBe('kafka-3.7.0');
    expect(result.remappedCount).toBe(0);
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
