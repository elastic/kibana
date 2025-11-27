/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getProductDocIndexName,
  DocumentationProduct,
  type ProductName,
} from '@kbn/product-doc-common';

export const getIndicesForProductNames = (
  productNames: ProductName[] | undefined,
  inferenceId?: string
): string | string[] => {
  if (!productNames || !productNames.length) {
    return Object.values(DocumentationProduct).map((productName: ProductName) =>
      getProductDocIndexName(productName, inferenceId)
    );
  }
  return productNames.map((productName: ProductName) =>
    getProductDocIndexName(productName, inferenceId)
  );
};
