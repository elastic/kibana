/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ProductName, DocumentationProduct } from './product';

// kb-product-doc-elasticsearch-8.15.zip
const artifactNameRegexp = /^kb-product-doc-([a-z]+)-([0-9]+\.[0-9]+)(\.zip)?$/;
const inferenceIdRegexp = /--([a-z0-9.-]+)(\.zip)?$/;
const allowedProductNames: ProductName[] = Object.values(DocumentationProduct);

export const DEFAULT_ELSER = '.elser-2-elasticsearch';

export const getArtifactName = ({
  productName,
  productVersion,
  excludeExtension = false,
  inferenceId,
}: {
  productName: ProductName;
  productVersion: string;
  excludeExtension?: boolean;
  inferenceId?: string;
}): string => {
  const ext = excludeExtension ? '' : '.zip';
  return `kb-product-doc-${productName}-${productVersion}${
    inferenceId && inferenceId !== DEFAULT_ELSER ? `--${inferenceId}` : ''
  }${ext}`.toLowerCase();
};

export const parseArtifactName = (artifactName: string) => {
  let name = artifactName.replace(/\.zip$/, '');
  // First, extract out the inference Id which is prefixed by --
  const inferenceIdMatch = name.match(inferenceIdRegexp);
  name = inferenceIdMatch ? name.replace(inferenceIdMatch[0], '') : artifactName;

  const match = name.match(artifactNameRegexp);
  if (match) {
    const productName = match[1].toLowerCase() as ProductName;
    const productVersion = match[2].toLowerCase();
    const inferenceId = inferenceIdMatch ? inferenceIdMatch[1] : undefined;
    if (allowedProductNames.includes(productName)) {
      return {
        productName,
        productVersion,
        ...(inferenceId ? { inferenceId } : {}),
      };
    }
  }
};
