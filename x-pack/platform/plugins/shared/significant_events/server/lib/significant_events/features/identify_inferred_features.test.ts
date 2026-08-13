/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature } from '@kbn/significant-events-schema';
import {
  applySemanticFeatureAliases,
  buildKnownFeatureIds,
  buildTelemetry,
  findSimilarFeatures,
  selectPreviouslyIdentifiedFeatures,
  stripModelAssignedAliases,
} from './identify_inferred_features';

const createFeature = ({ id, ...overrides }: Partial<Feature> & Pick<Feature, 'id'>): Feature => ({
  id,
  uuid: `uuid-${overrides.type ?? 'technology'}-${id}`,
  stream_name: 'logs.test',
  type: 'technology',
  subtype: 'library',
  title: id,
  description: `${id} description`,
  properties: { name: id },
  confidence: 80,
  ...overrides,
});

describe('selectPreviouslyIdentifiedFeatures', () => {
  it('fills the detailed prompt window round-robin across feature types', () => {
    const entities = Array.from({ length: 142 }, (_, index) =>
      createFeature({
        id: `entity-${String(index).padStart(3, '0')}`,
        type: 'entity',
        confidence: 100 - index / 1000,
      })
    );
    const technologies = Array.from({ length: 300 }, (_, index) =>
      createFeature({
        id: `technology-${String(index).padStart(3, '0')}`,
        type: 'technology',
        confidence: 100 - index / 1000,
      })
    );

    const selected = selectPreviouslyIdentifiedFeatures(
      [...technologies].reverse().concat([...entities].reverse()),
      100
    );

    expect(selected).toHaveLength(100);
    expect(selected.filter((feature) => feature.type === 'entity')).toHaveLength(50);
    expect(selected.filter((feature) => feature.type === 'technology')).toHaveLength(50);
    expect(selected.slice(0, 4).map(({ type, id }) => ({ type, id }))).toEqual([
      { type: 'entity', id: 'entity-000' },
      { type: 'technology', id: 'technology-000' },
      { type: 'entity', id: 'entity-001' },
      { type: 'technology', id: 'technology-001' },
    ]);
    expect(
      selectPreviouslyIdentifiedFeatures(
        [...technologies].reverse().concat([...entities].reverse()),
        100
      ).map((feature) => feature.id)
    ).toEqual(selected.map((feature) => feature.id));
  });

  it('keeps filling the window after one feature type is exhausted', () => {
    const features = [
      createFeature({ id: 'entity', type: 'entity' }),
      createFeature({ id: 'technology-1', type: 'technology', confidence: 90 }),
      createFeature({ id: 'technology-2', type: 'technology', confidence: 80 }),
    ];

    expect(selectPreviouslyIdentifiedFeatures(features, 3).map(({ id }) => id)).toEqual([
      'entity',
      'technology-1',
      'technology-2',
    ]);
  });
});

describe('buildKnownFeatureIds', () => {
  it('formats a stable, grouped inventory of every known id', () => {
    const features = [
      createFeature({ id: ' Kafka ', type: 'technology' }),
      createFeature({ id: 'checkout-api', type: 'entity' }),
      createFeature({ id: 'log4j', type: 'technology' }),
      createFeature({ id: 'kafka', type: 'technology' }),
    ];

    const result = buildKnownFeatureIds(features);
    expect(result.text).toBe(['entity: checkout-api', 'technology: kafka, log4j'].join('\n'));
    expect(result.droppedCount).toBe(0);
  });

  it('drops the stalest ids once the character budget is exhausted', () => {
    const features = [
      { ...createFeature({ id: 'stale-tech' }), updated_at: '2026-01-01T00:00:00.000Z' },
      { ...createFeature({ id: 'fresh-tech' }), updated_at: '2026-03-01T00:00:00.000Z' },
      { ...createFeature({ id: 'newer-tech' }), updated_at: '2026-02-01T00:00:00.000Z' },
    ];

    // Enough budget for "technology: fresh-tech, newer-tech" but not the third id.
    const result = buildKnownFeatureIds(features, 36);
    expect(result.text).toBe('technology: fresh-tech, newer-tech');
    expect(result.droppedCount).toBe(1);
  });
});

describe('stripModelAssignedAliases', () => {
  it('drops model-written aliases and keeps the rest of meta', () => {
    const feature = createFeature({
      id: 'okta',
      meta: { aliases: ['redis'], note: 'keep me' },
    });

    expect(stripModelAssignedAliases(feature).meta).toEqual({ note: 'keep me' });
  });

  it('removes meta entirely when aliases was its only key', () => {
    const feature = createFeature({ id: 'okta', meta: { aliases: ['redis'] } });

    expect(stripModelAssignedAliases(feature).meta).toBeUndefined();
  });

  it('returns the feature unchanged when no aliases are present', () => {
    const feature = createFeature({ id: 'okta', meta: { note: 'keep me' } });

    expect(stripModelAssignedAliases(feature)).toBe(feature);
  });
});

describe('applySemanticFeatureAliases', () => {
  it('captures a candidate id when the finalized feature reuses a search hit', () => {
    const feature = createFeature({ id: 'opentelemetry' });
    const result = applySemanticFeatureAliases(
      [feature],
      [
        {
          candidateId: 'go-opentelemetry',
          type: 'technology',
          hitIds: new Set(['opentelemetry']),
        },
      ]
    );

    expect(result.features[0].meta?.aliases).toEqual(['go-opentelemetry']);
    expect(result.reuseCount).toBe(1);
  });

  it('captures a reuse when a versioned search hit resolves to the canonical finalized id', () => {
    const result = applySemanticFeatureAliases(
      [createFeature({ id: 'okta' })],
      [
        {
          candidateId: 'okta-sdk',
          type: 'technology',
          hitIds: new Set(['okta-3.15.0']),
        },
      ]
    );

    expect(result.features[0].meta?.aliases).toEqual(['okta-sdk']);
    expect(result.reuseCount).toBe(1);
  });

  it('does not capture an alias when no hit id was reused', () => {
    const feature = createFeature({ id: 'opentelemetry' });
    const result = applySemanticFeatureAliases(
      [feature],
      [
        {
          candidateId: 'go-opentelemetry',
          type: 'technology',
          hitIds: new Set(['different-feature']),
        },
      ]
    );

    expect(result.features[0]).toBe(feature);
    expect(result.reuseCount).toBe(0);
  });

  it('does not count a candidate reusing its own id', () => {
    const feature = createFeature({ id: 'okta' });
    const result = applySemanticFeatureAliases(
      [feature],
      [
        {
          candidateId: 'okta',
          type: 'technology',
          hitIds: new Set(['okta']),
        },
      ]
    );

    expect(result.features[0]).toBe(feature);
    expect(result.reuseCount).toBe(0);
  });

  it('does not record an alias when the model emits both the candidate and the hit', () => {
    // The model searched with redis-cache, saw redis, and deliberately kept both.
    // An alias here would silently merge them once redis-cache expires.
    const result = applySemanticFeatureAliases(
      [createFeature({ id: 'redis' }), createFeature({ id: 'redis-cache' })],
      [
        {
          candidateId: 'redis-cache',
          type: 'technology',
          hitIds: new Set(['redis']),
        },
      ]
    );

    expect(result.features.every((feature) => feature.meta?.aliases === undefined)).toBe(true);
    expect(result.reuseCount).toBe(0);
  });

  it('records an alias when the candidate was abandoned for a versioned form of the hit', () => {
    // Searching with okta-3.14.1 and shipping okta still counts as abandoning the candidate.
    const result = applySemanticFeatureAliases(
      [createFeature({ id: 'okta' })],
      [
        {
          candidateId: 'okta-3.14.1',
          type: 'technology',
          hitIds: new Set(['okta']),
        },
      ]
    );

    expect(result.features[0].meta?.aliases).toEqual(['okta-3.14.1']);
    expect(result.reuseCount).toBe(1);
  });

  it('does not capture an ambiguous alias when multiple finalized features match the search hits', () => {
    const result = applySemanticFeatureAliases(
      [createFeature({ id: 'okta' }), createFeature({ id: 'auth0' })],
      [
        {
          candidateId: 'identity-provider',
          type: 'technology',
          hitIds: new Set(['okta', 'auth0']),
        },
      ]
    );

    expect(result.features.every((feature) => feature.meta?.aliases === undefined)).toBe(true);
    expect(result.reuseCount).toBe(0);
  });

  it('captures aliases only on the searched feature type', () => {
    const result = applySemanticFeatureAliases(
      [
        createFeature({ id: 'gcp', type: 'technology' }),
        createFeature({ id: 'gcp', type: 'entity' }),
      ],
      [
        {
          candidateId: 'google-cloud-sdk',
          type: 'technology',
          hitIds: new Set(['gcp']),
        },
      ]
    );

    expect(result.features[0].meta?.aliases).toEqual(['google-cloud-sdk']);
    expect(result.features[1].meta?.aliases).toBeUndefined();
    expect(result.reuseCount).toBe(1);
  });

  it('validates existing aliases, deduplicates them, and caps the newest ten', () => {
    const existingAliases = Array.from({ length: 10 }, (_, index) => `alias-${index}`);
    const feature = createFeature({
      id: 'canonical',
      meta: { aliases: [...existingAliases, 42, 'alias-9'] },
    });
    const result = applySemanticFeatureAliases(
      [feature],
      [
        {
          candidateId: 'candidate-new',
          type: 'technology',
          hitIds: new Set(['canonical']),
        },
      ]
    );

    expect(result.features[0].meta?.aliases).toEqual([
      'alias-1',
      'alias-2',
      'alias-3',
      'alias-4',
      'alias-5',
      'alias-6',
      'alias-7',
      'alias-8',
      'alias-9',
      'candidate-new',
    ]);
    expect(result.reuseCount).toBe(1);
  });
});

describe('findSimilarFeatures', () => {
  it('uses semantic search and returns only hits with the candidate type', async () => {
    const findFeatures = jest.fn().mockResolvedValue({
      hits: [
        createFeature({ id: 'okta', type: 'technology', title: undefined }),
        createFeature({ id: 'okta-service', type: 'entity' }),
      ],
    });
    const kiClient = {
      findFeatures,
    } as Parameters<typeof findSimilarFeatures>[0]['kiClient'];

    const result = await findSimilarFeatures({
      kiClient,
      streamName: 'logs.test',
      args: {
        candidate_id: 'okta-sdk',
        title: 'Okta SDK',
        description: 'Okta client technology',
        type: 'technology',
      },
    });

    expect(findFeatures).toHaveBeenCalledWith('logs.test', 'Okta SDK Okta client technology', {
      searchMode: 'semantic',
      limit: 20,
    });
    expect(result).toEqual([
      {
        id: 'okta',
        title: 'okta',
        description: 'okta description',
        confidence: 80,
      },
    ]);
  });

  it('caps same-type hits at 5 after over-fetching across types', async () => {
    const findFeatures = jest.fn().mockResolvedValue({
      hits: [
        createFeature({ id: 'other-service', type: 'entity' }),
        ...Array.from({ length: 7 }, (_, i) =>
          createFeature({ id: `tech-${i}`, type: 'technology' })
        ),
      ],
    });
    const kiClient = {
      findFeatures,
    } as Parameters<typeof findSimilarFeatures>[0]['kiClient'];

    const result = await findSimilarFeatures({
      kiClient,
      streamName: 'logs.test',
      args: {
        candidate_id: 'tech-x',
        title: 'Tech X',
        description: 'some technology',
        type: 'technology',
      },
    });

    expect(result).toHaveLength(5);
    expect(result.map((hit) => hit.id)).toEqual(['tech-0', 'tech-1', 'tech-2', 'tech-3', 'tech-4']);
  });

  it('propagates semantic search errors for the reasoning-agent boundary to handle', async () => {
    const kiClient = {
      findFeatures: jest.fn().mockRejectedValue(new Error('semantic unavailable')),
    } as Parameters<typeof findSimilarFeatures>[0]['kiClient'];

    await expect(
      findSimilarFeatures({
        kiClient,
        streamName: 'logs.test',
        args: {
          candidate_id: 'okta',
          title: 'Okta',
          description: 'Okta identity provider',
          type: 'technology',
        },
      })
    ).rejects.toThrow('semantic unavailable');
  });
});

describe('buildTelemetry', () => {
  const context = {
    run_id: 'run-1',
    connector_id: 'connector-1',
    iteration: 1,
    stream_name: 'logs.test',
    stream_type: 'wired' as const,
    docs_count: 20,
    excluded_features_count: 2,
    total_filters: 5,
    filters_capped: false,
    has_filtered_documents: true,
  };

  it.each(['failure', 'canceled'] as const)(
    'zero-fills deduplication counters when %s',
    (state) => {
      expect(buildTelemetry(context, 100, { state })).toEqual(
        expect.objectContaining({
          state,
          features_remapped: 0,
          semantic_verify_calls: 0,
          semantic_verify_reuses: 0,
        })
      );
    }
  );

  it('includes deduplication counters on success', () => {
    expect(
      buildTelemetry(context, 100, {
        state: 'success',
        tokensUsed: { prompt: 10, completion: 5, total: 15 },
        newCount: 2,
        updatedCount: 3,
        llmIgnoredCount: 1,
        codeIgnoredCount: 1,
        remappedCount: 2,
        semanticVerifyCalls: 3,
        semanticVerifyReuses: 1,
      })
    ).toEqual(
      expect.objectContaining({
        features_remapped: 2,
        semantic_verify_calls: 3,
        semantic_verify_reuses: 1,
      })
    );
  });
});
