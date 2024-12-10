/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  productDocIndexPattern,
  getProductDocIndexName,
  type ProductName,
} from '@kbn/product-doc-common';

export const getIndicesForProductNames = (
  productNames: ProductName[] | undefined
): string | string[] => {
  if (!productNames || !productNames.length) {
    return productDocIndexPattern;
  }
  return productNames.map(getProductDocIndexName);
};
