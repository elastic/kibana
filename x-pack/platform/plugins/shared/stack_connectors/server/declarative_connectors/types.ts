/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionScope, ConnectorMetadata } from '@kbn/connector-specs';

export interface DeclarativeConnectorIcon {
  path: string;
  contentHash: string;
}

export type DeclarativeConnectorMetadata = Omit<ConnectorMetadata, 'id' | 'icon'> & {
  icon?: DeclarativeConnectorIcon;
};

export interface DeclarativeJsonSchema {
  type: 'object' | 'string' | 'number' | 'integer' | 'boolean' | 'array';
  properties?: Record<string, DeclarativeJsonSchema>;
  required?: string[];
  items?: DeclarativeJsonSchema;
  format?: 'uri' | 'ipv4' | 'date-time';
  description?: string;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  enum?: Array<string | number | boolean>;
  additionalProperties?: boolean;
  xUi?: {
    label?: string;
    placeholder?: string;
    helpText?: string;
    hidden?: boolean;
    validate?: { allowedHosts?: boolean };
  };
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
  input: DeclarativeJsonSchema;
  request: DeclarativeRequest;
}

export interface DeclarativeConnectorSpec {
  schemaVersion: 1;
  id: string;
  version: string;
  metadata: DeclarativeConnectorMetadata;
  config: DeclarativeJsonSchema;
  auth: {
    type: 'api_key_header' | 'basic' | 'bearer' | 'none';
    header?: string;
    prefix?: string;
    label?: string;
    placeholder?: string;
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
  connectors: DeclarativeCatalogEntry[];
}

export interface StoredDeclarativeSpec extends DeclarativeCatalogEntry {
  raw: string;
  iconRaw?: string;
}

export interface StoredDeclarativeCatalog {
  catalogVersion: string;
  activeVersions: Record<string, string>;
  specifications: StoredDeclarativeSpec[];
  sourceUrl: string;
  fetchedAt: string;
}

export interface DeclarativeCatalogHealth {
  enabled: boolean;
  ready: boolean;
  sourceUrl: string;
  activeCatalogVersion?: string;
  connectorVersions: Record<string, string>;
  cachedSpecificationCount: number;
  lastRefreshAt?: string;
  lastError?: {
    message: string;
    at: string;
  };
}
