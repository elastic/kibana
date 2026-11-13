/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ActionType,
  ActionTypeConfig,
  ActionTypeParams,
  ActionTypeSecrets,
} from '../../types';

/** The type a catalog definition builds into. */
export type CatalogActionType = ActionType<
  ActionTypeConfig,
  ActionTypeSecrets,
  ActionTypeParams,
  unknown
>;

export interface CatalogDefinitionRef {
  id: string;
  version: string;
}

export interface StoredCatalogManifest {
  /** Manifest JSON text as given. */
  raw: string;
}

export interface StoredCatalogDefinition {
  connectorId: string;
  version: string;
  yaml: string;
  contentHash: string;
  /** Catalog version that introduced this definition. */
  catalogVersion: string;
}

export interface StoredCatalogAsset {
  sha256: string;
  /** Base64 content. */
  content: string;
}

export interface CatalogRequestOptions {
  signal?: AbortSignal;
}

export interface ConnectorCatalogStorage {
  ensureIndex(options?: CatalogRequestOptions): Promise<void>;
  getManifest(options?: CatalogRequestOptions): Promise<StoredCatalogManifest | undefined>;
  getDefinitions(
    refs: CatalogDefinitionRef[],
    options?: CatalogRequestOptions
  ): Promise<StoredCatalogDefinition[]>;
  createDefinition(definition: StoredCatalogDefinition): Promise<{ created: boolean }>;
  createAsset(asset: StoredCatalogAsset): Promise<{ created: boolean }>;
  replaceManifest(manifest: StoredCatalogManifest): Promise<void>;
}
