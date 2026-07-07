/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import {
  CODE_ANALYSIS_FEATURE_TYPE,
  computeFeatureUuid,
  type Feature,
  type QueryLink,
  type StreamQuery,
} from '@kbn/significant-events-schema';
import type { Streams } from '@kbn/streams-schema';
import type { KnowledgeIndicatorClient } from '../../streams/ki';
import { CODE_FEATURE_SUBTYPE_SERVICE_NAME } from './constants';
import { identifyCodeQueries } from './identify_code_queries';
import type { CodeRepositoryReader, LoggingChunk } from './types';

const STREAM = 'logs.checkout';
const REPO = 'acme/checkout';
const stream = { name: STREAM } as Streams.all.Definition;

const serviceNameFeature = (): Feature => ({
  id: CODE_FEATURE_SUBTYPE_SERVICE_NAME,
  uuid: computeFeatureUuid({
    id: CODE_FEATURE_SUBTYPE_SERVICE_NAME,
    stream_name: STREAM,
    type: CODE_ANALYSIS_FEATURE_TYPE,
  }),
  stream_name: STREAM,
  type: CODE_ANALYSIS_FEATURE_TYPE,
  subtype: CODE_FEATURE_SUBTYPE_SERVICE_NAME,
  description: 'service name',
  properties: { repository: REPO, service_name: 'checkoutservice', predicted: true },
  confidence: 80,
});

const createReader = (chunks: LoggingChunk[]): CodeRepositoryReader => ({
  getChangeFingerprint: jest.fn(async () => 'sha1'),
  getLanguageHistogram: jest.fn(async () => []),
  getObservedServiceNames: jest.fn(async () => []),
  searchCode: jest.fn(async () => []),
  getLoggingChunks: jest.fn(async () => chunks),
});

interface QueryOperation {
  index: { query: StreamQuery & { rule_backed?: boolean } };
}

const createKiClient = (features: Feature[], existingLinks: QueryLink[] = []) => {
  const bulk = jest.fn<Promise<void>, [string, QueryOperation[]]>(async () => undefined);
  const kiClient = {
    getFeatures: jest.fn(async () => ({ hits: features })),
    getStreamToQueryLinksMap: jest.fn(async () => ({ [STREAM]: existingLinks })),
    bulk,
  } as unknown as KnowledgeIndicatorClient;
  return { kiClient, bulk };
};

describe('identifyCodeQueries', () => {
  it('returns no_service when the service_name feature is missing', async () => {
    const { kiClient } = createKiClient([]);
    const result = await identifyCodeQueries({
      stream,
      kiClient,
      reader: createReader([{ content: 'logger.error("boom")' }]),
      logger: loggerMock.create(),
    });
    expect(result.status).toBe('no_service');
  });

  it('returns no_signatures when no logging chunks yield signatures', async () => {
    const { kiClient, bulk } = createKiClient([serviceNameFeature()]);
    const result = await identifyCodeQueries({
      stream,
      kiClient,
      reader: createReader([{ content: 'const x = 1;' }]),
      logger: loggerMock.create(),
    });
    expect(result.status).toBe('no_signatures');
    expect(bulk).not.toHaveBeenCalled();
  });

  it('generates durable draft predictive queries from logging chunks', async () => {
    const { kiClient, bulk } = createKiClient([serviceNameFeature()]);
    const result = await identifyCodeQueries({
      stream,
      kiClient,
      reader: createReader([
        { content: 'logger.error("Payment failed for order {}", id)', language: 'go' },
      ]),
      logger: loggerMock.create(),
    });

    expect(result.status).toBe('generated');
    expect(result.serviceName).toBe('checkoutservice');
    expect(result.generatedCount).toBe(1);

    expect(bulk).toHaveBeenCalledTimes(1);
    const operations = bulk.mock.calls[0][1];
    expect(operations).toHaveLength(1);
    const { query } = operations[0].index;
    expect(operations[0].index.query.rule_backed).toBe(false);
    // Durable: no expiry.
    expect(query.expires_at).toBeUndefined();
    expect(query.esql.query).toContain('service.name == "checkoutservice"');
  });

  it('de-duplicates against queries that already exist on the stream', async () => {
    const existingEsql =
      'FROM logs.checkout METADATA _id, _source | WHERE service.name == "checkoutservice" AND message LIKE "*Payment failed for order*"';
    const existingLink = {
      stream_name: STREAM,
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
      stream,
      kiClient,
      reader: createReader([
        { content: 'logger.error("Payment failed for order {}", id)', language: 'go' },
      ]),
      logger: loggerMock.create(),
    });

    expect(result.status).toBe('generated');
    expect(result.generatedCount).toBe(0);
    expect(bulk).not.toHaveBeenCalled();
  });
});
