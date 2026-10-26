/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LicenseType } from '@kbn/licensing-types';

export type CatalogRefreshOutcome = 'replaced' | 'same' | 'stale' | 'failed';

export interface CatalogRefreshResult {
  outcome: CatalogRefreshOutcome;
  stored: number;
}

export interface CatalogManifestRow {
  id: string;
  version: string;
  definitionUrl: string;
  contentHash: string;
}

export interface CatalogTypeMetadata {
  displayName: string;
  description: string;
  docsUrl?: string;
  icon?: { path: string; contentHash: string };
  minimumLicense: LicenseType;
  isTechnicalPreview?: boolean;
  supportedFeatureIds: string[];
}

export interface CatalogManifest {
  schemaVersion: 1;
  catalogVersion: string;
  sequence: number;
  previousCatalogVersion?: string;
  typeMetadata: Record<string, CatalogTypeMetadata>;
  connectors: CatalogManifestRow[];
}

export interface CatalogSource {
  readonly origin: string;
  readManifest(signal?: AbortSignal): Promise<{ bytes: string; signature: string }>;
  readText(path: string, maxBytes: number, signal?: AbortSignal): Promise<string>;
}

export interface StoredManifest {
  bytes: string;
  signature: string;
  sequence: number;
  catalogVersion: string;
  fetchedAt: string;
  seqNo?: number;
  primaryTerm?: number;
}

export interface StoredDefinition {
  id: string;
  version: string;
  yaml: string;
  contentHash: string;
  catalogVersion: string;
  addedAt: string;
}

export interface StoredAsset {
  contentHash: string;
  svg: string;
  addedAt: string;
}

export interface DefinitionHeader {
  schemaVersion: 1;
  id: string;
  version: string;
}
