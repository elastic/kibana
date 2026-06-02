/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

export class ArtifactNotFoundError extends Error {
  constructor(artifactName: string) {
    super(`No artifact for name ${artifactName}`);
    this.name = 'ArtifactNotFoundError';
    Object.setPrototypeOf(this, ArtifactNotFoundError.prototype);
  }
}

export class ManifestNotFoundError extends Error {
  constructor(manifestUrl: string) {
    super(`No manifest resource found at url: ${manifestUrl}`);
    this.name = 'ManifestNotFoundError';
    Object.setPrototypeOf(this, ManifestNotFoundError.prototype);
  }
}
