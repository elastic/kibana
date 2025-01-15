/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { productDocIndexPattern, getProductDocIndexName } from '@kbn/product-doc-common';
import { getIndicesForProductNames } from './get_indices_for_product_names';

describe('getIndicesForProductNames', () => {
  it('returns the index pattern when product names are not specified', () => {
    expect(getIndicesForProductNames(undefined)).toEqual(productDocIndexPattern);
    expect(getIndicesForProductNames([])).toEqual(productDocIndexPattern);
  });
  it('returns individual index names when product names are specified', () => {
    expect(getIndicesForProductNames(['kibana', 'elasticsearch'])).toEqual([
      getProductDocIndexName('kibana'),
      getProductDocIndexName('elasticsearch'),
    ]);
  });
});
