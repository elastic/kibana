/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { MAX_LEGEND_CATEGORIES, RANDOM_SAMPLE_SEED } from '../../common/constants';
import { buildVectorSampleRequest, parseVectorSampleResponse } from './vector_sample';

const hit = (fields: Record<string, unknown>): estypes.SearchHit => ({
  _index: 'docs',
  _id: String(Math.random()),
  fields,
});

describe('buildVectorSampleRequest', () => {
  const query = { bool: { filter: [{ term: { status: 'open' } }] } };

  it('requests vectors through the fields option with a seeded random sample', () => {
    expect(
      buildVectorSampleRequest({
        index: 'docs-*',
        query,
        vectorField: 'embedding',
        vectorFieldKind: 'dense_vector',
        labelField: 'category',
        size: 500,
      })
    ).toEqual({
      index: 'docs-*',
      size: 500,
      track_total_hits: false,
      _source: false,
      fields: ['embedding', 'category'],
      query: {
        function_score: {
          query,
          functions: [{ random_score: { seed: RANDOM_SAMPLE_SEED, field: '_seq_no' } }],
          boost_mode: 'replace',
        },
      },
    });
  });

  it('omits the label field and empty runtime mappings', () => {
    const request = buildVectorSampleRequest({
      index: 'docs',
      query,
      vectorField: 'embedding',
      vectorFieldKind: 'dense_vector',
      size: 10,
      runtimeMappings: {},
    });

    expect(request.fields).toEqual(['embedding']);
    expect(request).not.toHaveProperty('runtime_mappings');
  });

  it('adds the page offset only after the first page', () => {
    const page = (from: number) =>
      buildVectorSampleRequest({
        index: 'docs',
        query,
        vectorField: 'embedding',
        vectorFieldKind: 'dense_vector',
        size: 500,
        from,
      });

    expect(page(0)).not.toHaveProperty('from');
    expect(page(500).from).toBe(500);
  });

  it('includes runtime mappings when the data view defines them', () => {
    const runtimeMappings = { label: { type: 'keyword' as const } };

    expect(
      buildVectorSampleRequest({
        index: 'docs',
        query,
        vectorField: 'embedding',
        vectorFieldKind: 'dense_vector',
        labelField: 'label',
        size: 10,
        runtimeMappings,
      }).runtime_mappings
    ).toBe(runtimeMappings);
  });

  it('reads semantic_text embeddings from _source and only requests the label field', () => {
    const request = buildVectorSampleRequest({
      index: 'docs',
      query,
      vectorField: 'body',
      vectorFieldKind: 'semantic_text',
      labelField: 'category',
      size: 10,
    });

    expect(request._source).toEqual({ includes: ['_inference_fields'], exclude_vectors: false });
    expect(request.fields).toEqual(['category']);
  });

  it('omits the fields option for semantic_text without a label field', () => {
    const request = buildVectorSampleRequest({
      index: 'docs',
      query,
      vectorField: 'body',
      vectorFieldKind: 'semantic_text',
      size: 10,
    });

    expect(request).not.toHaveProperty('fields');
  });
});

describe('parseVectorSampleResponse with semantic_text', () => {
  const semanticHit = (
    field: string,
    embeddings: unknown[],
    fields?: Record<string, unknown>
  ): estypes.SearchHit => ({
    _index: 'docs',
    _id: String(Math.random()),
    _source: {
      _inference_fields: {
        [field]: {
          inference: {
            model_settings: { task_type: 'text_embedding' },
            chunks: {
              [field]: embeddings.map((embedding, i) => ({
                start_offset: i,
                end_offset: i + 1,
                embeddings: embedding,
              })),
            },
          },
        },
      },
    },
    fields,
  });

  it('averages chunk embeddings and reads dotted field names', () => {
    const result = parseVectorSampleResponse(
      [
        semanticHit('meta.body', [[1, 3]], { category: ['a'] }),
        semanticHit('meta.body', [
          [0, 2],
          [2, 4],
        ]),
      ],
      {
        vectorField: 'meta.body',
        vectorFieldKind: 'semantic_text',
        labelField: 'category',
        otherLabel: 'Other',
      }
    );

    expect(result.vectors).toEqual([
      [1, 3],
      [1, 3],
    ]);
    expect(result.categories).toEqual(['a', 'Other']);
  });

  it('skips sparse embeddings and hits without the field', () => {
    const result = parseVectorSampleResponse(
      [
        semanticHit('body', [{ hello: 0.5, world: 0.9 }]),
        semanticHit('other', [[1, 2]]),
        { _index: 'docs', _id: 'empty' },
      ],
      { vectorField: 'body', vectorFieldKind: 'semantic_text', otherLabel: 'Other' }
    );

    expect(result).toEqual({ vectors: [], skipped: 3 });
  });
});

const denseOptions = {
  vectorField: 'embedding',
  vectorFieldKind: 'dense_vector' as const,
  otherLabel: 'Other',
};

describe('parseVectorSampleResponse', () => {
  it('reads flat and nested vector arrays and skips invalid hits', () => {
    const result = parseVectorSampleResponse(
      [
        hit({ embedding: [0.1, 0.2, 0.3] }),
        hit({ embedding: [[0.4, 0.5, 0.6]] }),
        hit({ embedding: [1, 2] }),
        hit({ embedding: ['a', 'b', 'c'] }),
        hit({}),
      ],
      denseOptions
    );

    expect(result).toEqual({
      vectors: [
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
      ],
      skipped: 3,
    });
  });

  it('orders categories by frequency and maps missing labels to Other', () => {
    const result = parseVectorSampleResponse(
      [
        hit({ embedding: [1, 0], category: ['b'] }),
        hit({ embedding: [0, 1], category: ['a'] }),
        hit({ embedding: [1, 1], category: ['b'] }),
        hit({ embedding: [0, 0] }),
      ],
      { ...denseOptions, labelField: 'category' }
    );

    expect(result.categories).toEqual(['b', 'a', 'Other']);
    expect(result.categoryIndices).toEqual([0, 1, 0, 2]);
    expect(result.hasOtherCategory).toBe(true);
  });

  it('groups categories beyond the legend limit as Other', () => {
    const hits = Array.from({ length: MAX_LEGEND_CATEGORIES + 3 }, (_, i) =>
      hit({ embedding: [i, i], category: [i < 2 ? 'common' : `rare-${i}`] })
    );

    const result = parseVectorSampleResponse(hits, { ...denseOptions, labelField: 'category' });

    expect(result.categories).toHaveLength(MAX_LEGEND_CATEGORIES + 1);
    expect(result.categories?.[0]).toBe('common');
    expect(result.categories?.[MAX_LEGEND_CATEGORIES]).toBe('Other');
    expect(result.categoryIndices?.filter((index) => index === MAX_LEGEND_CATEGORIES)).toHaveLength(
      2
    );
  });

  it('does not add an Other category when every label fits', () => {
    const result = parseVectorSampleResponse(
      [hit({ embedding: [1, 0], category: [true] }), hit({ embedding: [0, 1], category: [false] })],
      { ...denseOptions, labelField: 'category' }
    );

    expect(result.categories).toEqual(['true', 'false']);
    expect(result.hasOtherCategory).toBe(false);
  });
});
