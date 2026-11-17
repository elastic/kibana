/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { buildSemanticTextProbeRequest, parseDenseSemanticTextFields } from './semantic_text';

const hit = (inferenceFields: Record<string, string>): estypes.SearchHit => ({
  _index: 'docs',
  _id: String(Math.random()),
  _source: {
    _inference_fields: Object.fromEntries(
      Object.entries(inferenceFields).map(([name, taskType]) => [
        name,
        { inference: { model_settings: { task_type: taskType }, chunks: {} } },
      ])
    ),
  },
});

describe('buildSemanticTextProbeRequest', () => {
  it('requests inference fields with vectors included', () => {
    expect(buildSemanticTextProbeRequest('docs-*', 20)).toEqual({
      index: 'docs-*',
      size: 20,
      track_total_hits: false,
      _source: { includes: ['_inference_fields'], exclude_vectors: false },
      query: { match_all: {} },
    });
  });
});

describe('parseDenseSemanticTextFields', () => {
  it('returns dense fields across hits and ignores sparse ones', () => {
    expect(
      parseDenseSemanticTextFields([
        hit({ title: 'text_embedding', sparse: 'sparse_embedding' }),
        hit({ 'meta.body': 'embedding', title: 'text_embedding' }),
        { _index: 'docs', _id: 'no-source' },
      ])
    ).toEqual(['meta.body', 'title']);
  });
});
