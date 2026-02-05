/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getProductDocIndexName,
  getSecurityLabsIndexName,
  DocumentationProduct,
  type ProductName,
  type ResourceType,
  ResourceTypes,
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

/**
 * Returns the indices to search for the requested resource types.
 */
export const getIndicesForResourceTypes = (
  productNames: ProductName[] | undefined,
  inferenceId?: string,
  resourceTypes: ResourceType[] | undefined = [ResourceTypes.productDoc]
): string | string[] => {
  const indices: string[] = [];

  if (resourceTypes.includes(ResourceTypes.productDoc)) {
    const productIndices = getIndicesForProductNames(productNames, inferenceId);
    indices.push(...(Array.isArray(productIndices) ? productIndices : [productIndices]));
  }

  if (resourceTypes.includes(ResourceTypes.securityLabs)) {
    indices.push(getSecurityLabsIndexName(inferenceId));
  }

  return indices.length === 1 ? indices[0] : indices;
};
