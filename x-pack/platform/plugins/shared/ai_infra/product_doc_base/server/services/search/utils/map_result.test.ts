/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { ProductDocumentationAttributes } from '@kbn/product-doc-common';
import { mapResult } from './map_result';

const createHit = (
  attrs: ProductDocumentationAttributes
): SearchHit<ProductDocumentationAttributes> => {
  return {
    _index: '.foo',
    _source: attrs,
  };
};

describe('mapResult', () => {
  it('returns the expected shape', () => {
    const input = createHit({
      content_title: 'content_title',
      content_body: { text: 'content_body' },
      product_name: 'kibana',
      root_type: 'documentation',
      slug: 'foo.html',
      url: 'http://lost.com/foo.html',
      version: '8.16',
      ai_subtitle: 'ai_subtitle',
      ai_summary: { text: 'ai_summary' },
      ai_questions_answered: { text: ['question A'] },
      ai_tags: ['foo', 'bar', 'test'],
    });

    const output = mapResult(input);

    expect(output).toEqual({
      content: 'content_body',
      productName: 'kibana',
      title: 'content_title',
      url: 'http://lost.com/foo.html',
    });
  });
});
