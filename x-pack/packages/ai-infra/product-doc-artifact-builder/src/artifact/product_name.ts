/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProductName } from '@kbn/product-doc-common';

export const getSourceProductName = (productName: ProductName) => {
  switch (productName) {
    case 'elasticsearch':
      return 'Elasticsearch';
    case 'observability':
      return 'Observability';
    case 'security':
      return 'Security';
    case 'kibana':
      return 'Kibana';
    default:
      throw new Error(`Unknown product name: ${productName}`);
  }
};

export const getProductNameFromSource = (source: string): ProductName => {
  switch (source) {
    case 'Elasticsearch':
      return 'elasticsearch';
    case 'Observability':
      return 'observability';
    case 'Security':
      return 'security';
    case 'Kibana':
      return 'kibana';
    default:
      throw new Error(`Unknown source product name: ${source}`);
  }
};
