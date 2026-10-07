/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createSourceEndpoint,
  createSourceId,
  getAvailableSourceTypes,
  getSourceTypeSlug,
  resolveSourceCapabilities,
  slugifySourceName,
} from './source_helpers';

describe('source helpers', () => {
  it('slugifies source names for schema-safe ids', () => {
    expect(slugifySourceName('Prod app logs!')).toBe('prod-app-logs');
    expect(slugifySourceName('---')).toBe('source');
  });

  it('maps schema source types to public input path slugs', () => {
    expect(getSourceTypeSlug('prometheus_remote_write')).toBe('prometheus-remote-write');
    expect(getSourceTypeSlug('es_prometheus_remote_write')).toBe('es-prometheus-remote-write');
    expect(getSourceTypeSlug('async_bulk')).toBe('async-bulk');
    expect(getSourceTypeSlug('es_otlp')).toBe('es-otlp');
  });

  it('creates human-readable source ids from names', () => {
    expect(
      createSourceId({
        name: 'Prod App Metrics',
        existingIds: [],
      })
    ).toBe('prod-app-metrics');
  });

  it('adds a readable numeric suffix when a slug is already taken', () => {
    expect(
      createSourceId({
        name: 'Prod App Metrics',
        existingIds: ['prod-app-metrics', 'prod-app-metrics-2'],
      })
    ).toBe('prod-app-metrics-3');
  });

  it('bounds generated source ids to the upstream limit', () => {
    expect(
      createSourceId({
        name: 'a'.repeat(500),
        existingIds: [],
      })
    ).toHaveLength(256);
  });

  it('builds managed input endpoints from the managed input base URL', () => {
    expect(
      createSourceEndpoint({
        type: 'prometheus_remote_write',
        sourceId: 'prometheus-remote-write-prod-app-metrics-abc123',
        managedInputBaseUrl: 'https://cluster.ingest.us-central1.gcp.elastic.cloud/',
        isServerless: true,
      })
    ).toBe(
      'https://cluster.ingest.us-central1.gcp.elastic.cloud/inputs/prometheus-remote-write/prometheus-remote-write-prod-app-metrics-abc123/api/v1/write'
    );
  });

  it('builds each managed OTLP signal endpoint', () => {
    expect(
      resolveSourceCapabilities({
        type: 'otlp',
        sourceId: 'otlp-prod-app-logs-abc123',
        managedInputBaseUrl: 'https://cluster.ingest.elastic.cloud',
      }).endpoints
    ).toEqual([
      {
        id: 'logs',
        url: 'https://cluster.ingest.elastic.cloud/inputs/otlp/otlp-prod-app-logs-abc123/v1/logs',
      },
      {
        id: 'metrics',
        url: 'https://cluster.ingest.elastic.cloud/inputs/otlp/otlp-prod-app-logs-abc123/v1/metrics',
      },
      {
        id: 'traces',
        url: 'https://cluster.ingest.elastic.cloud/inputs/otlp/otlp-prod-app-logs-abc123/v1/traces',
      },
    ]);
  });

  it('uses the managed Elasticsearch-compatible bulk endpoint', () => {
    expect(
      createSourceEndpoint({
        type: 'async_bulk',
        sourceId: 'async-bulk-prod-app-logs-abc123',
        managedInputBaseUrl: 'https://cluster.ingest.elastic.cloud',
      })
    ).toBe('https://cluster.ingest.elastic.cloud/_es/_bulk');
  });

  it('treats managed Prometheus as unavailable without its capability', () => {
    expect(
      createSourceEndpoint({
        type: 'prometheus_remote_write',
        sourceId: 'prometheus-remote-write-prod-app-metrics-abc123',
        managedInputBaseUrl: 'https://cluster.ingest.us-central1.gcp.elastic.cloud/',
        elasticsearchBaseUrl: 'https://cluster.es.us-central1.gcp.elastic.cloud/',
      })
    ).toBeUndefined();
  });

  it('builds direct es_prometheus_remote_write endpoints from the Elasticsearch base URL', () => {
    expect(
      createSourceEndpoint({
        type: 'es_prometheus_remote_write',
        sourceId: 'es-prometheus-remote-write-prod-app-metrics-abc123',
        elasticsearchBaseUrl: 'https://cluster.es.us-central1.gcp.elastic.cloud/',
      })
    ).toBe('https://cluster.es.us-central1.gcp.elastic.cloud/_prometheus/api/v1/write');
  });

  it('does not fall back from managed OTLP to direct Elasticsearch OTLP', () => {
    expect(
      createSourceEndpoint({
        type: 'otlp',
        sourceId: 'otlp-prod-app-logs-abc123',
        elasticsearchBaseUrl: 'https://cluster.es.us-central1.gcp.elastic.cloud/',
      })
    ).toBeUndefined();
  });

  it('builds direct es_otlp endpoints from the Elasticsearch base URL', () => {
    expect(
      createSourceEndpoint({
        type: 'es_otlp',
        sourceId: 'es-otlp-prod-app-logs-abc123',
        elasticsearchBaseUrl: 'https://cluster.es.us-central1.gcp.elastic.cloud/',
      })
    ).toBe('https://cluster.es.us-central1.gcp.elastic.cloud/_otlp');
  });

  it.each([
    ['es_otlp', '/_otlp'],
    ['es_prometheus_remote_write', '/_prometheus/api/v1/write'],
  ] as const)('builds direct %s endpoints in Cloud', (type, path) => {
    expect(
      createSourceEndpoint({
        type,
        sourceId: 'source-id',
        elasticsearchBaseUrl: 'https://cluster.es.elastic.cloud',
        isCloudEnabled: true,
      })
    ).toBe(`https://cluster.es.elastic.cloud${path}`);
  });

  it('does not fall back to direct Elasticsearch endpoints in Cloud', () => {
    expect(
      createSourceEndpoint({
        type: 'prometheus_remote_write',
        sourceId: 'prometheus-remote-write-prod-app-metrics-abc123',
        managedInputBaseUrl: 'https://cluster.ingest.us-central1.gcp.elastic.cloud/',
        elasticsearchBaseUrl: 'https://cluster.es.us-central1.gcp.elastic.cloud/',
        isCloudEnabled: true,
      })
    ).toBeUndefined();
    expect(
      createSourceEndpoint({
        type: 'otlp',
        sourceId: 'otlp-prod-app-logs-abc123',
        elasticsearchBaseUrl: 'https://cluster.es.us-central1.gcp.elastic.cloud/',
        isCloudEnabled: true,
      })
    ).toBeUndefined();
  });

  it('builds legacy bulk endpoints from the Elasticsearch base URL', () => {
    expect(
      createSourceEndpoint({
        type: 'bulk',
        sourceId: 'bulk-prod-app-logs-abc123',
        managedInputBaseUrl: 'https://cluster.ingest.us-central1.gcp.elastic.cloud/',
        elasticsearchBaseUrl: 'https://cluster.es.us-central1.gcp.elastic.cloud/',
      })
    ).toBe('https://cluster.es.us-central1.gcp.elastic.cloud/_bulk');
  });

  it('builds direct bulk endpoints in Cloud', () => {
    expect(
      createSourceEndpoint({
        type: 'bulk',
        sourceId: 'bulk-prod-app-logs-abc123',
        elasticsearchBaseUrl: 'https://cluster.es.us-central1.gcp.elastic.cloud/',
        isCloudEnabled: true,
      })
    ).toBe('https://cluster.es.us-central1.gcp.elastic.cloud/_bulk');
  });

  it('does not build managed input endpoints without a managed input base URL', () => {
    expect(
      createSourceEndpoint({
        type: 'otlp',
        sourceId: 'otlp-prod-app-logs-abc123',
      })
    ).toBeUndefined();
  });

  it.each([
    ['otlp', true, 'source_scoped'],
    ['async_bulk', true, 'source_scoped'],
    ['prometheus_remote_write', true, 'source_scoped'],
    ['bulk', true, 'elasticsearch_ingest'],
    ['es_otlp', true, 'elasticsearch_ingest'],
    ['es_prometheus_remote_write', true, 'elasticsearch_ingest'],
  ] as const)(
    'resolves %s endpoint availability and API key strategy together',
    (type, isAvailable, apiKeyStrategy) => {
      expect(
        resolveSourceCapabilities({
          type,
          sourceId: 'source-id',
          managedInputBaseUrl: 'https://cluster.ingest.elastic.cloud',
          elasticsearchBaseUrl: 'https://cluster.es.elastic.cloud',
          isCloudEnabled: true,
          isServerless: true,
        })
      ).toMatchObject({ isAvailable, apiKeyStrategy });
    }
  );

  it.each([
    ['otlp', 'source_scoped', {}],
    ['async_bulk', 'source_scoped', {}],
    [
      'prometheus_remote_write',
      'source_scoped',
      { managedInputBaseUrl: 'https://cluster.ingest.elastic.cloud' },
    ],
    ['bulk', 'elasticsearch_ingest', {}],
    ['es_otlp', 'elasticsearch_ingest', {}],
    ['es_prometheus_remote_write', 'elasticsearch_ingest', {}],
  ] as const)(
    'marks %s unavailable when its required environment is missing',
    (type, apiKeyStrategy, environment) => {
      expect(
        resolveSourceCapabilities({
          type,
          sourceId: 'source-id',
          ...environment,
        })
      ).toMatchObject({ isAvailable: false, apiKeyStrategy, endpoint: undefined });
    }
  );

  it('enables managed Prometheus with the fully qualified feature capability', () => {
    expect(
      resolveSourceCapabilities({
        type: 'prometheus_remote_write',
        sourceId: 'source-id',
        managedInputBaseUrl: 'https://cluster.ingest.elastic.cloud',
        managedOtlpPrwEndpointEnabled: true,
      })
    ).toEqual({
      endpoint:
        'https://cluster.ingest.elastic.cloud/inputs/prometheus-remote-write/source-id/api/v1/write',
      endpoints: [
        {
          id: 'default',
          url: 'https://cluster.ingest.elastic.cloud/inputs/prometheus-remote-write/source-id/api/v1/write',
        },
      ],
      apiKeyStrategy: 'source_scoped',
      isAvailable: true,
    });
  });

  it('only exposes V1 source types supported by the deployment', () => {
    expect(
      getAvailableSourceTypes({
        managedInputBaseUrl: 'https://cluster.ingest.elastic.cloud',
        elasticsearchBaseUrl: 'https://cluster.es.elastic.cloud',
        isCloudEnabled: true,
        isServerless: true,
      })
    ).toEqual(['async_bulk', 'otlp', 'prometheus_remote_write', 'bulk']);

    expect(
      getAvailableSourceTypes({
        elasticsearchBaseUrl: 'https://localhost:9200',
      })
    ).toEqual(['bulk']);
  });
});
