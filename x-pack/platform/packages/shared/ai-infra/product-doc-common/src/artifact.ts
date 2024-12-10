/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ProductName, DocumentationProduct } from './product';

// kb-product-doc-elasticsearch-8.15.zip
const artifactNameRegexp = /^kb-product-doc-([a-z]+)-([0-9]+\.[0-9]+)(\.zip)?$/;
const allowedProductNames: ProductName[] = Object.values(DocumentationProduct);

export const getArtifactName = ({
  productName,
  productVersion,
  excludeExtension = false,
}: {
  productName: ProductName;
  productVersion: string;
  excludeExtension?: boolean;
}): string => {
  const ext = excludeExtension ? '' : '.zip';
  return `kb-product-doc-${productName}-${productVersion}${ext}`.toLowerCase();
};

export const parseArtifactName = (artifactName: string) => {
  const match = artifactNameRegexp.exec(artifactName);
  if (match) {
    const productName = match[1].toLowerCase() as ProductName;
    const productVersion = match[2].toLowerCase();
    if (allowedProductNames.includes(productName)) {
      return {
        productName,
        productVersion,
      };
    }
  }
};
