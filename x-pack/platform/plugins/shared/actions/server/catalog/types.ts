/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionScope, AuthTypeDef, ConnectorSpec } from '@kbn/connector-specs';
import type { LicenseType } from '@kbn/licensing-types';
import type { ActionType, ActionTypeConfig, ActionTypeParams, ActionTypeSecrets } from '../types';

export type CatalogActionType = ActionType<
  ActionTypeConfig,
  ActionTypeSecrets,
  ActionTypeParams,
  unknown
>;

export interface DeclarativeConnectorIcon {
  path: string;
  contentHash: string;
}

export interface DeclarativeRequest {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url?: string;
  baseUrl?: string;
  path?: string;
  query?: Record<string, unknown>;
  headers?: Record<string, unknown>;
  body?: unknown;
  bodyType?: 'json' | 'form' | 'text';
  retry?: {
    statusCodes: number[];
    maxAttempts: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
  };
  pagination?: {
    strategy: 'link_header';
    header?: string;
    maxPages: number;
    itemsPath?: string;
    outputKey: string;
  };
  response?: {
    dataPath?: string;
    outputKey?: string;
    rateLimitHeaders?: {
      remaining?: string;
      reset?: string;
    };
  };
}

export interface DeclarativeAction {
  description?: string;
  isTool?: boolean;
  scope?: ActionScope;
  input: Record<string, unknown>;
  request: DeclarativeRequest;
}

export interface DeclarativeAuthTypeDef extends AuthTypeDef {
  prefix?: string;
}

/** Versioned contract YAML. Type metadata lives on the signed manifest, not here. */
export interface CatalogContractSpec {
  schemaVersion: 1;
  id: string;
  version: string;
  config: Record<string, unknown>;
  auth: {
    types: Array<string | DeclarativeAuthTypeDef>;
  };
  actions: Record<string, DeclarativeAction>;
  test: {
    description?: string;
    request: DeclarativeRequest;
  };
}

export type DeclarativeConnectorSpec = CatalogContractSpec;

export interface CatalogTypeMetadata {
  displayName: string;
  description: string;
  docsUrl?: string;
  icon?: DeclarativeConnectorIcon;
  minimumLicense: LicenseType;
  isTechnicalPreview?: boolean;
  supportedFeatureIds: string[];
}

export interface CatalogManifestRow {
  id: string;
  version: string;
  definitionUrl: string;
  contentHash: string;
}

export interface CatalogManifest {
  schemaVersion: 1;
  catalogVersion: string;
  sequence: number;
  previousCatalogVersion?: string;
  typeMetadata: Record<string, CatalogTypeMetadata>;
  connectors: CatalogManifestRow[];
  skippedTypeMetadata: string[];
}

/** @deprecated Use CatalogManifestRow. */
export type DeclarativeCatalogEntry = CatalogManifestRow;

export interface TypeMetadataState {
  displayName: string;
  description: string;
  docsUrl?: string;
  minimumLicense: LicenseType;
  isTechnicalPreview?: boolean;
  supportedFeatureIds: string[];
  iconDataUrl?: string;
}

export interface BuiltVersion {
  id: string;
  version: string;
  contentHash: string;
  contract: CatalogContractSpec;
  spec: Omit<ConnectorSpec, 'metadata'>;
}

export interface CatalogSource {
  readonly origin: string;
  readManifest(): Promise<{ bytes: string; signature: string }>;
  readText(path: string, maxBytes: number): Promise<string>;
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

export type DeclarativeCatalogSkipReason = 'reserved_prefix' | 'already_registered' | 'load_failed';

export interface DeclarativeCatalogSkippedEntry {
  id: string;
  version?: string;
  reason: DeclarativeCatalogSkipReason;
  detail?: string;
}

export interface DeclarativeCatalogPinnedVersionMissing {
  id: string;
  version: string;
}
