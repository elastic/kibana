/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SourceEndpoint, SourceType } from './types';

export type SourceTypeSlug =
  | 'otlp'
  | 'es-otlp'
  | 'async-bulk'
  | 'prometheus-remote-write'
  | 'es-prometheus-remote-write'
  | 'bulk';
export type SourceApiKeyStrategy = 'source_scoped' | 'elasticsearch_ingest';
const MAX_SOURCE_ID_LENGTH = 256;

export interface SourceCapabilities {
  endpoint?: string;
  endpoints: SourceEndpoint[];
  apiKeyStrategy: SourceApiKeyStrategy;
  isAvailable: boolean;
}

export interface SourceEnvironment {
  managedInputBaseUrl?: string;
  elasticsearchBaseUrl?: string;
  isCloudEnabled?: boolean;
  isServerless?: boolean;
  managedOtlpPrwEndpointEnabled?: boolean;
}

const SOURCE_TYPE_SLUGS: Record<SourceType, SourceTypeSlug> = {
  otlp: 'otlp',
  es_otlp: 'es-otlp',
  async_bulk: 'async-bulk',
  prometheus_remote_write: 'prometheus-remote-write',
  es_prometheus_remote_write: 'es-prometheus-remote-write',
  bulk: 'bulk',
};

const trimTrailingSlashes = (value: string): string => value.replace(/\/+$/, '');
const trimTrailingHyphens = (value: string): string => value.replace(/-+$/, '');

export const getSourceTypeSlug = (type: SourceType): SourceTypeSlug => SOURCE_TYPE_SLUGS[type];

export const slugifySourceName = (name: string): string => {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'source';
};

export const createSourceId = ({
  name,
  existingIds,
}: {
  name: string;
  existingIds: Iterable<string>;
}): string => {
  const baseId = trimTrailingHyphens(slugifySourceName(name).slice(0, MAX_SOURCE_ID_LENGTH));
  const taken = new Set(existingIds);
  let candidate = baseId;
  let suffix = 2;

  while (taken.has(candidate)) {
    const readableSuffix = `-${suffix}`;
    candidate = `${trimTrailingHyphens(
      baseId.slice(0, MAX_SOURCE_ID_LENGTH - readableSuffix.length)
    )}${readableSuffix}`;
    suffix += 1;
  }

  return candidate;
};

export const resolveSourceCapabilities = ({
  type,
  sourceId,
  managedInputBaseUrl,
  elasticsearchBaseUrl,
  isServerless = false,
  managedOtlpPrwEndpointEnabled = false,
}: {
  type: SourceType;
  sourceId: string;
} & SourceEnvironment): SourceCapabilities => {
  const managedInputUrl = normalizeEndpointUrl(managedInputBaseUrl);
  const elasticsearchUrl = normalizeEndpointUrl(elasticsearchBaseUrl);
  const isDirectSource =
    type === 'bulk' || type === 'es_otlp' || type === 'es_prometheus_remote_write';
  const apiKeyStrategy = isDirectSource ? 'elasticsearch_ingest' : 'source_scoped';
  let endpoint: string | undefined;
  let endpoints: SourceEndpoint[] = [];

  if (type === 'bulk') {
    endpoint = elasticsearchUrl ? `${elasticsearchUrl}/_bulk` : undefined;
  } else if (type === 'es_otlp') {
    endpoint = elasticsearchUrl ? `${elasticsearchUrl}/_otlp` : undefined;
  } else if (type === 'es_prometheus_remote_write') {
    endpoint = elasticsearchUrl ? `${elasticsearchUrl}/_prometheus/api/v1/write` : undefined;
  } else if (type === 'async_bulk' && managedInputUrl) {
    endpoint = `${managedInputUrl}/_es/_bulk`;
  } else if (type === 'otlp' && managedInputUrl) {
    endpoint = `${managedInputUrl}/inputs/otlp/${sourceId}`;
    endpoints = (['logs', 'metrics', 'traces'] as const).map((signal) => ({
      id: signal,
      url: `${endpoint}/v1/${signal}`,
    }));
  } else if (
    type === 'prometheus_remote_write' &&
    managedInputUrl &&
    (isServerless || managedOtlpPrwEndpointEnabled)
  ) {
    endpoint = `${managedInputUrl}/inputs/prometheus-remote-write/${sourceId}/api/v1/write`;
  }

  if (endpoint && endpoints.length === 0) {
    endpoints = [{ id: 'default', url: endpoint }];
  }

  return {
    endpoint,
    endpoints,
    apiKeyStrategy,
    isAvailable: endpoint !== undefined,
  };
};

const V1_SOURCE_TYPES: SourceType[] = ['async_bulk', 'otlp', 'prometheus_remote_write', 'bulk'];

export const getAvailableSourceTypes = (environment: SourceEnvironment): SourceType[] =>
  V1_SOURCE_TYPES.filter(
    (type) =>
      resolveSourceCapabilities({
        type,
        sourceId: 'source-id',
        ...environment,
      }).isAvailable
  );

export const createSourceEndpoint = ({
  type,
  sourceId,
  ...environment
}: {
  type: SourceType;
  sourceId: string;
} & SourceEnvironment): string | undefined =>
  resolveSourceCapabilities({ type, sourceId, ...environment }).endpoint;

const normalizeEndpointUrl = (url?: string): string | undefined => {
  const trimmedUrl = url?.trim();
  return trimmedUrl ? trimTrailingSlashes(trimmedUrl) : undefined;
};
