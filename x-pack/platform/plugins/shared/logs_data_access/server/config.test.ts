/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { configSchema } from './config';
import {
  MAX_RERANK_INFERENCE_ID_LENGTH,
  RERANK_ENDPOINT,
} from './services/semantic_log_search/constants';

describe('configSchema', () => {
  it('defaults the rerank endpoint to the one Elasticsearch preconfigures', () => {
    expect(configSchema.validate({})).toEqual({
      semanticLogSearch: { rerankInferenceId: RERANK_ENDPOINT },
    });
  });

  it.each([
    '.rerank-v1-elasticsearch',
    '.jina-reranker-v3',
    'my_custom-reranker.2',
    '.jina-reranker-v2-base-multilingual',
  ])('accepts the inference id %s', (rerankInferenceId) => {
    expect(
      configSchema.validate({ semanticLogSearch: { rerankInferenceId } }).semanticLogSearch
        .rerankInferenceId
    ).toBe(rerankInferenceId);
  });

  it.each([
    // The id is interpolated into the `_inference/rerank/<id>` request path, so anything that
    // could change the shape of that path is rejected rather than escaped.
    ['a path separator', 'rerank/../_cluster'],
    ['a query string', 'rerank?pretty'],
    ['whitespace', 'rerank v1'],
    ['a newline', 'rerank\nv1'],
    ['an empty string', ''],
  ])('rejects %s', (_description, rerankInferenceId) => {
    expect(() => configSchema.validate({ semanticLogSearch: { rerankInferenceId } })).toThrow();
  });

  it('bounds the id length', () => {
    const tooLong = 'x'.repeat(MAX_RERANK_INFERENCE_ID_LENGTH + 1);

    expect(() =>
      configSchema.validate({ semanticLogSearch: { rerankInferenceId: tooLong } })
    ).toThrow(/length/);
  });
});
