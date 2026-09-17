/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionScope, AuthTypeDef, ConnectorMetadata } from '@kbn/connector-specs';

export interface DeclarativeConnectorIcon {
  path: string;
  contentHash: string;
}

export type DeclarativeConnectorMetadata = Omit<ConnectorMetadata, 'id' | 'icon'> & {
  icon?: DeclarativeConnectorIcon;
};

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

export interface DeclarativeConnectorSpec {
  schemaVersion: 1;
  id: string;
  version: string;
  metadata: DeclarativeConnectorMetadata;
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

export interface DeclarativeCatalogEntry {
  id: string;
  version: string;
  definitionUrl: string;
  contentHash: string;
}

export interface DeclarativeCatalogManifest {
  schemaVersion: 1;
  catalogVersion: string;
  activeVersions: Record<string, string>;
  connectors: DeclarativeCatalogEntry[];
}

export type DeclarativeCatalogVersionStatus = 'active' | 'published';

export interface DeclarativeCatalogVersionEntry {
  id: string;
  version: string;
  status: DeclarativeCatalogVersionStatus;
}

export type DeclarativeCatalogSkipReason = 'reserved_prefix' | 'already_registered' | 'load_failed';

export interface DeclarativeCatalogSkippedEntry {
  id: string;
  version?: string;
  reason: DeclarativeCatalogSkipReason;
  detail?: string;
}

export interface DeclarativeCatalogHealth {
  enabled: boolean;
  ready: boolean;
  sourceUrl: string;
  activeCatalogVersion?: string;
  versions: DeclarativeCatalogVersionEntry[];
  registeredTypeIds: string[];
  skipped: DeclarativeCatalogSkippedEntry[];
  lastRefreshAt?: string;
  lastError?: { message: string; at: string };
}
