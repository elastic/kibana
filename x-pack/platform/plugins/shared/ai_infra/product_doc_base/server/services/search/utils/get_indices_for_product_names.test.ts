/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { productDocIndexPattern, getProductDocIndexName } from '@kbn/product-doc-common';
import { getIndicesForProductNames } from './get_indices_for_product_names';
import { defaultInferenceEndpoints } from '@kbn/inference-common';

describe('getIndicesForProductNames', () => {
  it('returns the index pattern when product names are not specified', () => {
    expect(getIndicesForProductNames(undefined, undefined)).toEqual(productDocIndexPattern);
    expect(getIndicesForProductNames([], undefined)).toEqual(productDocIndexPattern);
  });
  it('returns individual index names when product names are specified', () => {
    expect(getIndicesForProductNames(['kibana', 'elasticsearch'])).toEqual([
      getProductDocIndexName('kibana'),
      getProductDocIndexName('elasticsearch'),
    ]);
  });
  it('returns individual index names when ELSER EIS is specified', () => {
    expect(getIndicesForProductNames(['kibana', 'elasticsearch'], '.elser-v2-elastic')).toEqual([
      getProductDocIndexName('kibana'),
      getProductDocIndexName('elasticsearch'),
    ]);
  });
  it('returns individual index names when ELSER is specified', () => {
    expect(
      getIndicesForProductNames(['kibana', 'elasticsearch'], defaultInferenceEndpoints.ELSER)
    ).toEqual([getProductDocIndexName('kibana'), getProductDocIndexName('elasticsearch')]);
  });

  it('returns the index pattern when inferenceId is specified', () => {
    expect(
      getIndicesForProductNames(
        ['kibana', 'elasticsearch'],
        defaultInferenceEndpoints.MULTILINGUAL_E5_SMALL
      )
    ).toEqual([
      '.kibana_ai_product_doc_kibana-.multilingual-e5-small-elasticsearch',
      '.kibana_ai_product_doc_elasticsearch-.multilingual-e5-small-elasticsearch',
    ]);
    expect(getIndicesForProductNames(['kibana', 'elasticsearch'], '.anyInferenceId')).toEqual([
      '.kibana_ai_product_doc_kibana-.anyInferenceId',
      '.kibana_ai_product_doc_elasticsearch-.anyInferenceId',
    ]);
  });
});
