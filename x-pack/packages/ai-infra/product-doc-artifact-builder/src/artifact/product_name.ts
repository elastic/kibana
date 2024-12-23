/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProductName } from '@kbn/product-doc-common';

const productNameToSourceNamesMap: Record<ProductName, string[]> = {
  kibana: ['Kibana'],
  elasticsearch: ['Elasticsearch'],
  security: ['Security'],
  observability: ['Observability'],
};

const sourceNameToProductName = Object.entries(productNameToSourceNamesMap).reduce<
  Record<string, ProductName>
>((map, [productName, sourceNames]) => {
  sourceNames.forEach((sourceName) => {
    map[sourceName] = productName as ProductName;
  });
  return map;
}, {});

export const getSourceNamesFromProductName = (productName: ProductName): string[] => {
  if (!productNameToSourceNamesMap[productName]) {
    throw new Error(`Unknown product name: ${productName}`);
  }
  return productNameToSourceNamesMap[productName];
};

export const getProductNameFromSource = (source: string): ProductName => {
  if (!sourceNameToProductName[source]) {
    throw new Error(`Unknown source name: ${source}`);
  }
  return sourceNameToProductName[source];
};
