/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { documentWithInferenceFields } from './inference_fields';

const hit = (partial: Pick<SearchHit, '_source' | 'fields'>): SearchHit =>
  ({
    _index: 'kb-artifact-builder-kibana',
    ...partial,
  } as SearchHit);

describe('documentWithInferenceFields', () => {
  const embeddings = {
    content_body: { inference: { inference_id: '.jina-embeddings-v5-text-small' } },
  };

  it('keeps embeddings already present on _source', () => {
    const doc = documentWithInferenceFields(
      hit({
        _source: { slug: 'a', _inference_fields: embeddings },
        fields: { _inference_fields: [{ ignored: true }] },
      })
    );

    expect(doc).toEqual({ slug: 'a', _inference_fields: embeddings });
  });

  it('merges embeddings returned by the fields API', () => {
    const doc = documentWithInferenceFields(
      hit({
        _source: { slug: 'a', content_body: 'body' },
        fields: { _inference_fields: [embeddings] },
      })
    );

    expect(doc).toEqual({
      slug: 'a',
      content_body: 'body',
      _inference_fields: embeddings,
    });
  });

  it('accepts an unwrapped fields payload', () => {
    const doc = documentWithInferenceFields(
      hit({
        _source: { slug: 'a' },
        fields: { _inference_fields: embeddings },
      })
    );

    expect(doc._inference_fields).toEqual(embeddings);
  });

  it('leaves the document unchanged when no embeddings were returned', () => {
    const doc = documentWithInferenceFields(hit({ _source: { slug: 'a' } }));

    expect(doc).toEqual({ slug: 'a' });
  });
});
