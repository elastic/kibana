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
import { getCodePredictiveSourceId } from './identify_code_features';
import { identifyCodeQueries, shouldPersistCodeIntelligenceQuery } from './identify_code_queries';
import type { StreamSamplingSource } from './link_ingesting_streams';

// The code KI key is the service name; logs land in a separate real stream.
const SERVICE_KEY = 'checkoutservice';
const INGEST_STREAM = 'logs.checkout';
const REPO = 'acme/checkout';
const SPACE_ID = 'default';
const LOG_SOURCE_ID = getCodePredictiveSourceId(SPACE_ID, 'logs');
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
          streamName === LOG_SOURCE_ID ? existingLinks : [],
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
      spaceId: SPACE_ID,
      streams,
      kiClient,
      loggingChunks: [{ content: 'logger.error("boom")' }],
      esClient: createEsClient(true),
      logger: loggerMock.create(),
      beforeWrite: jest.fn().mockResolvedValue(undefined),
    });
    expect(result.status).toBe('generated');
  });

  it('gates message-string queries for OTel services unless stream resolution was bypassed', async () => {
    const logger = loggerMock.create();
    const { kiClient, bulk } = createKiClient([]);
    const gated = await identifyCodeQueries({
      serviceName: SERVICE_KEY,
      repository: REPO,
      gitSha: 'sha1',
      spaceId: SPACE_ID,
      streams,
      kiClient,
      loggingChunks: [{ content: 'logger.error("boom")' }],
      esClient: createEsClient(true),
      logger,
      beforeWrite: jest.fn().mockResolvedValue(undefined),
      hasOtel: true,
    });
    expect(gated.status).toBe('otel_gated');
    expect(bulk).not.toHaveBeenCalled();

    const bypassed = await identifyCodeQueries({
      serviceName: SERVICE_KEY,
      repository: REPO,
      gitSha: 'sha1',
      spaceId: SPACE_ID,
      streams,
      kiClient,
      loggingChunks: [{ content: 'logger.error("boom")' }],
      esClient: createEsClient(true),
      logger,
      beforeWrite: jest.fn().mockResolvedValue(undefined),
      hasOtel: true,
      otelGateBypassed: true,
    });
    expect(bypassed.status).toBe('generated');
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('otel gate bypassed'));
  });

  it('returns no_signatures when no logging chunks yield signatures', async () => {
    const { kiClient, bulk } = createKiClient([serviceNameFeature()]);
    const result = await identifyCodeQueries({
      serviceName: SERVICE_KEY,
      repository: REPO,
      gitSha: 'sha1',
      spaceId: SPACE_ID,
      streams,
      kiClient,
      loggingChunks: [{ content: 'const x = 1;' }],
      esClient: createEsClient(true),
      logger: loggerMock.create(),
      beforeWrite: jest.fn().mockResolvedValue(undefined),
    });
    expect(result.status).toBe('no_signatures');
    expect(bulk).not.toHaveBeenCalled();
  });

  it('uses the stable logs predictive source when no log-bearing stream exists', async () => {
    // Chicken-vs-egg: source indexed before any logs ship. Predictive queries
    // remain owned and visible through their space-scoped compatibility source.
    const { kiClient, bulk } = createKiClient([serviceNameFeature()]);
    const result = await identifyCodeQueries({
      serviceName: SERVICE_KEY,
      repository: REPO,
      gitSha: 'sha1',
      spaceId: SPACE_ID,
      streams,
      kiClient,
      loggingChunks: [
        { content: 'logger.error("Payment failed for order {}", id)', language: 'go' },
      ],
      esClient: createEsClient(false),
      logger: loggerMock.create(),
      beforeWrite: jest.fn().mockResolvedValue(undefined),
    });
    expect(result.status).toBe('generated');
    expect(result.generatedCount).toBe(1);
    expect(result.streams).toEqual([LOG_SOURCE_ID]);

    expect(bulk).toHaveBeenCalledTimes(1);
    // Attached to the predictive source, not the service key, root logs, or a real stream.
    expect(bulk.mock.calls[0][0]).toBe(LOG_SOURCE_ID);
    const { query } = bulk.mock.calls[0][1][0].index;
    // Targets the broad logs-* pattern and MATCH_PHRASE on `message` (text).
    expect(query.esql.query).toContain('FROM logs-*');
    expect(query.esql.query).toContain('MATCH_PHRASE(message, "Payment failed for order")');
    expect(query.esql.query).not.toContain('service.name');
  });

  it('always writes predictive log queries to the logs predictive source', async () => {
    const { kiClient, bulk } = createKiClient([serviceNameFeature()]);
    const result = await identifyCodeQueries({
      serviceName: SERVICE_KEY,
      repository: REPO,
      gitSha: 'sha1',
      spaceId: SPACE_ID,
      streams,
      kiClient,
      loggingChunks: [
        { content: 'logger.error("Payment failed for order {}", id)', language: 'go' },
      ],
      esClient: createEsClient(true),
      logger: loggerMock.create(),
      beforeWrite: jest.fn().mockResolvedValue(undefined),
    });

    expect(result.status).toBe('generated');
    expect(result.serviceName).toBe(SERVICE_KEY);
    expect(result.generatedCount).toBe(1);
    expect(result.streams).toEqual([LOG_SOURCE_ID]);

    expect(bulk).toHaveBeenCalledTimes(1);
    expect(bulk.mock.calls[0][0]).toBe(LOG_SOURCE_ID);
    const operations = bulk.mock.calls[0][1];
    expect(operations).toHaveLength(1);
    const { query } = operations[0].index;
    expect(operations[0].index.query.rule_backed).toBe(false);
    expect(query.expires_at).toBeUndefined();
    expect(query.esql.query).toContain('FROM logs-*');
    expect(query.esql.query).toContain('MATCH_PHRASE(message, "Payment failed for order")');
    expect(query.esql.query).not.toContain('service.name');
  });

  it('keeps real stream metadata from changing predictive ownership', async () => {
    const { kiClient, bulk } = createKiClient([serviceNameFeature()]);
    const result = await identifyCodeQueries({
      serviceName: SERVICE_KEY,
      repository: REPO,
      gitSha: 'sha1',
      spaceId: SPACE_ID,
      streams: mixedConventionStreams,
      metadata: { loggingPattern: 'otel' },
      kiClient,
      loggingChunks: [
        { content: 'logger.error("Payment failed for order {}", id)', language: 'go' },
      ],
      esClient: createEsClient(true),
      logger: loggerMock.create(),
      beforeWrite: jest.fn().mockResolvedValue(undefined),
    });

    expect(result.streams).toEqual([LOG_SOURCE_ID]);
    expect(bulk).toHaveBeenCalledWith(LOG_SOURCE_ID, expect.any(Array));
  });

  it.each([
    ['match', 59, false],
    ['match', 60, true],
    ['stats', 79, true],
    ['stats', 80, true],
    ['match', undefined, false],
  ] as const)('retains %s queries only at or above the threshold (%s)', (_type, severity, kept) => {
    expect(shouldPersistCodeIntelligenceQuery({ severity_score: severity })).toBe(kept);
  });

  it('does not bulk persist low-severity deterministic logging predictions', async () => {
    const { kiClient, bulk } = createKiClient([]);
    const result = await identifyCodeQueries({
      serviceName: SERVICE_KEY,
      repository: REPO,
      gitSha: 'sha1',
      spaceId: SPACE_ID,
      streams,
      kiClient,
      loggingChunks: [{ content: 'logger.warn("Payment failed")' }],
      esClient: createEsClient(true),
      logger: loggerMock.create(),
      beforeWrite: jest.fn().mockResolvedValue(undefined),
    });

    expect(result.generatedCount).toBe(0);
    expect(bulk).not.toHaveBeenCalled();
  });

  it('de-duplicates against queries that already exist on the logs stream', async () => {
    const existingEsql =
      'FROM logs-* METADATA _id, _source | WHERE MATCH_PHRASE(message, "Payment failed for order")';
    const existingLink = {
      stream_name: LOG_SOURCE_ID,
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
      spaceId: SPACE_ID,
      streams,
      kiClient,
      loggingChunks: [
        { content: 'logger.error("Payment failed for order {}", id)', language: 'go' },
      ],
      esClient: createEsClient(true),
      logger: loggerMock.create(),
      beforeWrite: jest.fn().mockResolvedValue(undefined),
    });

    expect(result.status).toBe('generated');
    expect(result.generatedCount).toBe(0);
    expect(bulk).not.toHaveBeenCalled();
  });
});
