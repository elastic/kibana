/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ArtifactManifest {
  formatVersion: string;
  productName: string;
  productVersion: string;
}

export const getArtifactManifest = ({
  productName,
  stackVersion,
}: {
  productName: string;
  stackVersion: string;
}): ArtifactManifest => {
  return {
    formatVersion: '1.0.0',
    productName,
    productVersion: stackVersion,
  };
};
