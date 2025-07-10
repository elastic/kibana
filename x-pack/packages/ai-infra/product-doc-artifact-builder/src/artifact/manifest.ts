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
  formatVersion,
}: {
  productName: ProductName;
  stackVersion: string;
  formatVersion: string;
}): ArtifactManifest => {
  return {
    formatVersion,
    productName,
    productVersion: stackVersion,
  };
};
