/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_ELSER,
  DEFAULT_E5_SMALL,
  DEFAULT_JINA,
  getSemanticTextMapping,
} from './semantic_text';

describe('getSemanticTextMapping', () => {
  it('defaults to ELSER when no inference id is provided', () => {
    expect(getSemanticTextMapping()).toEqual({
      type: 'semantic_text',
      inference_id: DEFAULT_ELSER,
    });
  });

  it('returns a bare mapping for ELSER', () => {
    expect(getSemanticTextMapping(DEFAULT_ELSER)).toEqual({
      type: 'semantic_text',
      inference_id: DEFAULT_ELSER,
    });
  });

  it('returns model_settings for E5-small', () => {
    expect(getSemanticTextMapping(DEFAULT_E5_SMALL)).toEqual({
      type: 'semantic_text',
      inference_id: DEFAULT_E5_SMALL,
      model_settings: {
        service: 'elasticsearch',
        task_type: 'text_embedding',
        dimensions: 384,
        similarity: 'cosine',
        element_type: 'float',
      },
    });
  });

  it('returns a bare mapping for Jina v5', () => {
    expect(getSemanticTextMapping(DEFAULT_JINA)).toEqual({
      type: 'semantic_text',
      inference_id: DEFAULT_JINA,
    });
  });

  it('falls back to a bare mapping for an unrecognized inference id', () => {
    expect(getSemanticTextMapping('.some-custom-endpoint')).toEqual({
      type: 'semantic_text',
      inference_id: '.some-custom-endpoint',
    });
  });
});
