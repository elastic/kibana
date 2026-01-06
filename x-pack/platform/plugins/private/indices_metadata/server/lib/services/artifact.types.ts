/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Represents an artifact retrieved from the CDN.
 *
 * @property data - The actual content of the artifact. The type is unknown as it depends on the specific artifact.
 * @property modified - Indicates whether the artifact has been modified since the last retrieval.
 *              When true, it means this is a fresh download.
 *              When false, it means this is a cached version that hasn't changed.
 */
export interface Manifest {
  data: unknown;
  modified: boolean;
}

/**
 * Configuration details for the CDN used to fetch artifacts.
 *
 * @property url - The base URL of the CDN for artifact downloads.
 * @property pubKey - The public key string used to verify artifact signatures.
 */
export interface CdnConfig {
  url: string;
  pubKey: string;
  requestTimeout: number;
}
