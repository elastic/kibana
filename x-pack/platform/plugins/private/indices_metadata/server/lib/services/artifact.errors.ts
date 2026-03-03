/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

/**
 * Error thrown when a requested artifact is not found in the manifest
 */
export class ArtifactNotFoundError extends Error {
  constructor(artifactName: string) {
    super(`No artifact for name ${artifactName}`);
    this.name = 'ArtifactNotFoundError';
    Object.setPrototypeOf(this, ArtifactNotFoundError.prototype);
  }
}

/**
 * Error thrown when the manifest file is not found in the CDN
 */
export class ManifestNotFoundError extends Error {
  constructor(manifestUrl: string) {
    super(`No manifest resource found at url: ${manifestUrl}`);
    this.name = 'ManifestNotFoundError';
    Object.setPrototypeOf(this, ManifestNotFoundError.prototype);
  }
}
