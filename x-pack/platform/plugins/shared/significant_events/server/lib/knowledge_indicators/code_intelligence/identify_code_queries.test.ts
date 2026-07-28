/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  CODE_ANALYSIS_FEATURE_TYPE,
  computeFeatureUuid,
  type Feature,
  type QueryLink,
  type StreamQuery,
} from '@kbn/significant-events-schema';
import type { KnowledgeIndicatorClient } from '../knowledge_indicator_client';
import { CODE_FEATURE_SUBTYPE_SERVICE_NAME } from './constants';
import { identifyCodeQueries } from './identify_code_queries';
import type { StreamSamplingSource } from './link_ingesting_streams';

// The code KI key is the service name; logs land in a separate real stream.
const SERVICE_KEY = 'checkoutservice';
const INGEST_STREAM = 'logs.checkout';
const REPO = 'acme/checkout';
const streams: StreamSamplingSource[] = [
  { name: INGEST_STREAM, index: INGEST_STREAM, convention: 'ecs' },
];
const mixedConventionStreams: StreamSamplingSource[] = [
  { name: 'logs.otel', index: 'logs.otel', convention: 'otel' },
  { name: INGEST_STREAM, index: INGEST_STREAM, convention: 'ecs' },
];

const serviceNameFeature = (): Feature => ({
  id: CODE_FEATURE_SUBTYPE_SERVICE_NAME,
  uuid: computeFeatureUuid({
    id: CODE_FEATURE_SUBTYPE_SERVICE_NAME,
    stream_name: SERVICE_KEY,
  }),
  stream_name: SERVICE_KEY,
  type: CODE_ANALYSIS_FEATURE_TYPE,
  subtype: CODE_FEATURE_SUBTYPE_SERVICE_NAME,
  description: 'service name',
  properties: { repository: REPO, service_name: SERVICE_KEY, predicted: true },
  confidence: 80,
});

/**
 * Mocks the `fieldCaps` probe used to resolve log-bearing streams: reports a
 * keyword `message` field when `hasMessageField`, otherwise no usable field.
 */
const createEsClient = (hasMessageField: boolean): ElasticsearchClient =>
  ({
    fieldCaps: jest.fn(async () => ({
      fields: hasMessageField
        ? { message: { keyword: { type: 'keyword', aggregatable: true, searchable: true } } }
        : {},
    })),
  } as unknown as ElasticsearchClient);

interface QueryOperation {
  index: { query: StreamQuery & { rule_backed?: boolean } };
}

const createKiClient = (features: Feature[], existingLinks: QueryLink[] = []) => {
  const bulk = jest.fn<Promise<void>, [string, QueryOperation[]]>(async () => undefined);
  const kiClient = {
    getFeatures: jest.fn(async () => ({ hits: features })),
    getStreamToQueryLinksMap: jest.fn(async (streamNames: string[]) =>
      Object.fromEntries(
        streamNames.map((streamName) => [
          streamName,
          streamName === INGEST_STREAM ? existingLinks : [],
        ])
      )
    ),
    bulk,
  } as unknown as KnowledgeIndicatorClient;
  return { kiClient, bulk };
};

describe('identifyCodeQueries', () => {
  it('does not require a per-service language feature', async () => {
    const { kiClient } = createKiClient([]);
    const result = await identifyCodeQueries({
      serviceName: SERVICE_KEY,
      repository: REPO,
      gitSha: 'sha1',
      streams,
      kiClient,
      loggingChunks: [{ content: 'logger.error("boom")' }],
      esClient: createEsClient(true),
      logger: loggerMock.create(),
    });
    expect(result.status).toBe('generated');
  });

  it('returns no_signatures when no logging chunks yield signatures', async () => {
    const { kiClient, bulk } = createKiClient([serviceNameFeature()]);
    const result = await identifyCodeQueries({
      serviceName: SERVICE_KEY,
      repository: REPO,
      gitSha: 'sha1',
      streams,
      kiClient,
      loggingChunks: [{ content: 'const x = 1;' }],
      esClient: createEsClient(true),
      logger: loggerMock.create(),
    });
    expect(result.status).toBe('no_signatures');
    expect(bulk).not.toHaveBeenCalled();
  });

  it('returns no_ingesting when no log-bearing stream is available', async () => {
    const { kiClient, bulk } = createKiClient([serviceNameFeature()]);
    const result = await identifyCodeQueries({
      serviceName: SERVICE_KEY,
      repository: REPO,
      gitSha: 'sha1',
      streams,
      kiClient,
      loggingChunks: [
        { content: 'logger.error("Payment failed for order {}", id)', language: 'go' },
      ],
      esClient: createEsClient(false),
      logger: loggerMock.create(),
    });
    expect(result.status).toBe('no_ingesting');
    expect(bulk).not.toHaveBeenCalled();
  });

  it('generates durable draft predictive queries on the log-bearing stream', async () => {
    const { kiClient, bulk } = createKiClient([serviceNameFeature()]);
    const result = await identifyCodeQueries({
      serviceName: SERVICE_KEY,
      repository: REPO,
      gitSha: 'sha1',
      streams,
      kiClient,
      loggingChunks: [
        { content: 'logger.error("Payment failed for order {}", id)', language: 'go' },
      ],
      esClient: createEsClient(true),
      logger: loggerMock.create(),
    });

    expect(result.status).toBe('generated');
    expect(result.serviceName).toBe(SERVICE_KEY);
    expect(result.generatedCount).toBe(1);
    expect(result.streams).toEqual([INGEST_STREAM]);

    expect(bulk).toHaveBeenCalledTimes(1);
    // Queries are written to the real ingesting stream, not the service key.
    expect(bulk.mock.calls[0][0]).toBe(INGEST_STREAM);
    const operations = bulk.mock.calls[0][1];
    expect(operations).toHaveLength(1);
    const { query } = operations[0].index;
    expect(operations[0].index.query.rule_backed).toBe(false);
    expect(query.expires_at).toBeUndefined();
    // Message-based (mirrors the log pipeline); no service field.
    expect(query.esql.query).toContain(`FROM ${INGEST_STREAM}`);
    expect(query.esql.query).toContain('message LIKE "*Payment failed for order*"');
    expect(query.esql.query).not.toContain('service.name');
  });

  it('narrows predictive queries to the inferred telemetry family', async () => {
    const { kiClient, bulk } = createKiClient([serviceNameFeature()]);
    const result = await identifyCodeQueries({
      serviceName: SERVICE_KEY,
      repository: REPO,
      gitSha: 'sha1',
      streams: mixedConventionStreams,
      metadata: { loggingPattern: 'otel' },
      kiClient,
      loggingChunks: [
        { content: 'logger.error("Payment failed for order {}", id)', language: 'go' },
      ],
      esClient: createEsClient(true),
      logger: loggerMock.create(),
    });

    expect(result.streams).toEqual(['logs.otel']);
    expect(bulk).toHaveBeenCalledWith('logs.otel', expect.any(Array));
  });

  it('de-duplicates against queries that already exist on the ingesting stream', async () => {
    const existingEsql =
      'FROM logs.checkout METADATA _id, _source | WHERE message LIKE "*Payment failed for order*"';
    const existingLink = {
      stream_name: INGEST_STREAM,
      rule_backed: false,
      rule_id: 'r1',
      query: {
        id: 'q1',
        type: 'match',
        title: 'existing',
        esql: { query: existingEsql },
      },
    } as QueryLink;

    const { kiClient, bulk } = createKiClient([serviceNameFeature()], [existingLink]);
    const result = await identifyCodeQueries({
      serviceName: SERVICE_KEY,
      repository: REPO,
      gitSha: 'sha1',
      streams,
      kiClient,
      loggingChunks: [
        { content: 'logger.error("Payment failed for order {}", id)', language: 'go' },
      ],
      esClient: createEsClient(true),
      logger: loggerMock.create(),
    });

    expect(result.status).toBe('generated');
    expect(result.generatedCount).toBe(0);
    expect(bulk).not.toHaveBeenCalled();
  });
});
