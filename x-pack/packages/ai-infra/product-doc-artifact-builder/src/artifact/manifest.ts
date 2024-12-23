/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ArtifactManifest, ProductName } from '@kbn/product-doc-common';

export const getArtifactManifest = ({
  productName,
  stackVersion,
}: {
  productName: ProductName;
  stackVersion: string;
}): ArtifactManifest => {
  return {
    formatVersion: '1.0.0',
    productName,
    productVersion: stackVersion,
  };
};
