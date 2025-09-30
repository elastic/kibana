/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Tests for clusterSampleDocs utility
 */

import { clusterSampleDocs } from './cluster_sample_docs';

// mock ai-tools heavy functions to keep test deterministic and focused
jest.mock('@kbn/ai-tools', () => {
  return {
    mergeSampleDocumentsWithFieldCaps: jest.fn().mockImplementation(({ hits }) => {
      return {
        total: hits.length,
        analyzedFields: hits.length > 0 ? Object.keys(hits[0]._source || {}) : [],
      };
    }),
    sortAndTruncateAnalyzedFields: jest.fn().mockImplementation((analysis) => analysis),
  };
});

describe('clusterSampleDocs', () => {
  it('returns empty result when no hits', () => {
    const result = clusterSampleDocs({ hits: [], fieldCaps: { fields: {}, indices: [] } });
    expect(result).toEqual({ sampled: 0, noise: [], clusters: [] });
  });

  it('clusters similar documents and marks outliers as noise', () => {
    // create 5 similar docs (same schema + values) and 2 outliers
    const similarDocs = Array.from({ length: 5 }).map((_, i) => ({
      _id: `a-${i}`,
      _index: '',
      _source: {
        'service.name': 'checkout',
        'log.level': 'info',
        message: `Checkout succeeded ${i}`,
      },
    }));

    const noiseDocs = [
      {
        _id: 'n-1',
        _index: '',
        _source: { 'service.name': 'auth', 'log.level': 'error', error: 'boom' },
      },
      {
        _id: 'n-2',
        _index: '',
        _source: { 'service.name': 'payments', 'log.level': 'warn', detail: 'slow' },
      },
    ];

    const hits = [...similarDocs, ...noiseDocs];

    const fieldCaps = {
      indices: [],
      fields: {
        'service.name': { keyword: { type: 'keyword', searchable: true, aggregatable: true } },
        'log.level': { keyword: { type: 'keyword', searchable: true, aggregatable: true } },
        message: { text: { type: 'text', searchable: true, aggregatable: false } },
        error: { keyword: { type: 'keyword', searchable: true, aggregatable: true } },
        detail: { keyword: { type: 'keyword', searchable: true, aggregatable: true } },
      },
    };

    const result = clusterSampleDocs({ hits, fieldCaps });

    expect(result.sampled).toBe(7);

    // Expect exactly one cluster containing the 5 similar docs (order of hits preserved per implementation mapping)
    expect(result.clusters.length).toBe(1);
    const cluster = result.clusters[0];
    expect(cluster.count).toBe(5);
    const sampleIds = cluster.samples.map((h) => h._id);
    expect(sampleIds.sort()).toEqual(similarDocs.map((d) => d._id).sort());

    // Expect noise to contain the two remaining doc indices (their indices in original hits array)
    // We don't rely on exact order, just presence.
    expect(result.noise.length).toBe(2);
    const noiseIds = result.noise.map((idx) => hits[idx]._id).sort();
    expect(noiseIds).toEqual(['n-1', 'n-2']);

    // merged analysis should reflect total documents in the cluster
    expect(cluster.analysis.total).toBe(5);
  });

  it('can produce multiple clusters', () => {
    // Two groups of 5 docs each with distinct schemas/values + 1 noise doc
    const group1 = Array.from({ length: 5 }).map((_, i) => ({
      _id: `g1-${i}`,
      _index: '',
      _source: {
        'service.name': 'frontend',
        'log.level': 'info',
        message: `UI rendered component ${i}`,
      },
    }));

    const group2 = Array.from({ length: 5 }).map((_, i) => ({
      _id: `g2-${i}`,
      _index: '',
      _source: {
        'service.name': 'backend',
        'log.level': 'debug',
        message: `Handled request ${i}`,
        route: '/api/orders',
      },
    }));

    // noise: unique field that appears in no other doc, plus differing values
    const noise = [
      {
        _id: 'noise-1',
        _index: '',
        _source: {
          'service.name': 'metrics',
          'log.level': 'warn',
          metric: 'cpu',
          value: 0.9,
        },
      },
    ];

    const hits = [...group1, ...group2, ...noise];

    const fieldCaps = {
      indices: [],
      fields: {
        'service.name': { keyword: { type: 'keyword', searchable: true, aggregatable: true } },
        'log.level': { keyword: { type: 'keyword', searchable: true, aggregatable: true } },
        message: { text: { type: 'text', searchable: true, aggregatable: false } },
        route: { keyword: { type: 'keyword', searchable: true, aggregatable: true } },
        metric: { keyword: { type: 'keyword', searchable: true, aggregatable: true } },
        value: { float: { type: 'float', searchable: true, aggregatable: true } },
      },
    };

    const result = clusterSampleDocs({ hits, fieldCaps });

    expect(result.sampled).toBe(11);

    // We expect exactly 2 clusters of size 5 each and 1 noise point
    expect(result.clusters.length).toBe(2);
    const sizes = result.clusters.map((c) => c.count).sort();
    expect(sizes).toEqual([5, 5]);
    expect(result.noise.length).toBe(1);
    const noiseIds = result.noise.map((idx) => hits[idx]._id);
    expect(noiseIds).toContain('noise-1');

    // Validate cluster membership contains expected IDs (order not guaranteed)
    const clusterDocIds = result.clusters.map((c) => c.samples.map((h) => h._id).sort());
    const expectedGroup1 = group1.map((d) => d._id).sort();
    const expectedGroup2 = group2.map((d) => d._id).sort();
    // Each expected group should match one of the cluster arrays
    expect(
      clusterDocIds.some((ids) => JSON.stringify(ids) === JSON.stringify(expectedGroup1))
    ).toBe(true);
    expect(
      clusterDocIds.some((ids) => JSON.stringify(ids) === JSON.stringify(expectedGroup2))
    ).toBe(true);
  });

  describe('source/fields input variations', () => {
    const fieldCapsCommon = {
      indices: [],
      fields: {
        'service.name': { keyword: { type: 'keyword', searchable: true, aggregatable: true } },
        'log.level': { keyword: { type: 'keyword', searchable: true, aggregatable: true } },
        message: { text: { type: 'text', searchable: true, aggregatable: false } },
      },
    };

    it('clusters when only _source is present', () => {
      const hits = Array.from({ length: 5 }).map((_, i) => ({
        _id: `s-${i}`,
        _index: '',
        _source: {
          'service.name': 'svc-a',
          'log.level': 'info',
          message: `hello ${i}`,
        },
      }));

      const result = clusterSampleDocs({ hits, fieldCaps: fieldCapsCommon });
      expect(result.sampled).toBe(5);
      expect(result.clusters.length).toBe(1);
      expect(result.clusters[0].count).toBe(5);
    });

    it('clusters when only fields is present', () => {
      const hits = Array.from({ length: 5 }).map((_, i) => ({
        _id: `f-${i}`,
        _index: '',
        fields: {
          'service.name': ['svc-b'],
          'log.level': ['info'],
          message: [`hi ${i}`],
        },
      }));

      const result = clusterSampleDocs({ hits, fieldCaps: fieldCapsCommon });
      expect(result.sampled).toBe(5);
      expect(result.clusters.length).toBe(1);
      expect(result.clusters[0].count).toBe(5);
    });

    it('clusters when _source and fields are combined (fields override duplication)', () => {
      const hits = Array.from({ length: 5 }).map((_, i) => ({
        _id: `sf-${i}`,
        _index: '',
        _source: {
          'service.name': 'svc-c',
          'log.level': 'info',
          message: `source msg ${i}`,
        },
        fields: {
          'service.name': ['svc-c'],
          'log.level': ['info'],
          message: [`override msg ${i}`],
        },
      }));

      const result = clusterSampleDocs({ hits, fieldCaps: fieldCapsCommon });
      expect(result.sampled).toBe(5);
      // Should still cluster together
      expect(result.clusters.length).toBe(1);
      expect(result.clusters[0].count).toBe(5);
    });
  });
});
