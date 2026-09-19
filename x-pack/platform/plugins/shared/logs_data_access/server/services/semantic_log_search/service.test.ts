/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import type { SemanticLogSearchParams } from '../../../common/services/semantic_log_search/types';
import { search } from './service';
import { MAX_KQL_FILTER_LENGTH, MAX_NL_QUERY_LENGTH, MAX_PATTERNS, MAX_TARGET_LENGTH } from './constants';

const createEsClient = ({
  fields = {
    message: { text: { type: 'text', searchable: true, aggregatable: false } },
    '@timestamp': { date: { type: 'date', searchable: true, aggregatable: true } },
  },
  rerankAvailable = true,
}: {
  fields?: Record<string, unknown>;
  rerankAvailable?: boolean;
} = {}) => {
  const fieldCaps = jest.fn().mockResolvedValue({ fields });
  const inferenceGet = rerankAvailable
    ? jest.fn().mockResolvedValue({ endpoints: [{ inference_id: '.rerank-v1-elasticsearch' }] })
    : jest.fn().mockRejectedValue(new Error('not found'));
  const esqlQuery = jest.fn().mockResolvedValue({ columns: [], values: [] });

  return {
    esClient: {
      fieldCaps,
      inference: { get: inferenceGet },
      esql: { query: esqlQuery },
    } as unknown as ElasticsearchClient,
    fieldCaps,
    inferenceGet,
    esqlQuery,
  };
};

const createParams = (
  esClient: ElasticsearchClient,
  overrides: Partial<SemanticLogSearchParams> = {}
): SemanticLogSearchParams => ({
  esClient,
  target: 'logs-*',
  nlQuery: 'connection failures',
  timeRange: { start: 1704067200000, end: 1704153600000 },
  ...overrides,
});

describe('semantic log search service', () => {
  it('returns successful patterns through the runtime strategy', async () => {
    const { esClient } = createEsClient();

    const result = await search(createParams(esClient), loggerMock.create());

    expect(result).toEqual({ status: 'success', patterns: [] });
  });

  it('returns missing_fields without checking inference or running ES|QL', async () => {
    const { esClient, inferenceGet, esqlQuery } = createEsClient({
      fields: {
        '@timestamp': { date: { type: 'date', searchable: true, aggregatable: true } },
      },
    });

    const result = await search(createParams(esClient), loggerMock.create());

    expect(result).toEqual({ status: 'unavailable', reason: 'missing_fields' });
    expect(inferenceGet).not.toHaveBeenCalled();
    expect(esqlQuery).not.toHaveBeenCalled();
  });

  it('returns inference_unavailable without running ES|QL', async () => {
    const { esClient, esqlQuery } = createEsClient({ rerankAvailable: false });

    const result = await search(createParams(esClient), loggerMock.create());

    expect(result).toEqual({ status: 'unavailable', reason: 'inference_unavailable' });
    expect(esqlQuery).not.toHaveBeenCalled();
  });

  it('returns execution error when the field capability check fails', async () => {
    const logger = loggerMock.create();
    const { esClient, fieldCaps } = createEsClient();
    fieldCaps.mockRejectedValue(new Error('forbidden'));

    const result = await search(createParams(esClient), logger);

    expect(result).toEqual({ status: 'error', reason: 'execution' });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('field capability check'));
  });

  it.each([
    // blank / whitespace-only strings
    { target: '' },
    { target: '   ' },
    { nlQuery: '' },
    { nlQuery: '   ' },
    // non-finite / non-integer time values
    { timeRange: { start: Number.NaN, end: 1704153600000 } },
    { timeRange: { start: 1704067200000, end: Number.POSITIVE_INFINITY } },
    // inverted and zero-width ranges
    { timeRange: { start: 1704153600000, end: 1704067200000 } },
    { timeRange: { start: 1704067200000, end: 1704067200000 } },
    // out-of-range maxPatterns
    { maxPatterns: 0 },
    { maxPatterns: MAX_PATTERNS + 1 },
    { maxPatterns: 1.5 },
    // injection in target — esql.from() does not quote; pipe injects ES|QL commands
    { target: 'logs | DROP message' },
    { target: 'logs\\sneaky' },
    // over-length inputs
    { nlQuery: 'x'.repeat(MAX_NL_QUERY_LENGTH + 1) },
    { kqlFilter: 'x'.repeat(MAX_KQL_FILTER_LENGTH + 1) },
    { target: 'x'.repeat(MAX_TARGET_LENGTH + 1) },
  ])('rejects invalid params before Elasticsearch work: %o', async (overrides) => {
    const { esClient, fieldCaps, inferenceGet, esqlQuery } = createEsClient();

    const result = await search(
      createParams(esClient, overrides as Partial<SemanticLogSearchParams>),
      loggerMock.create()
    );

    expect(result).toEqual({ status: 'error', reason: 'invalid_params' });
    expect(fieldCaps).not.toHaveBeenCalled();
    expect(inferenceGet).not.toHaveBeenCalled();
    expect(esqlQuery).not.toHaveBeenCalled();
  });

  it('trims whitespace from target and applies maxPatterns default before ES|QL', async () => {
    const { esClient, esqlQuery } = createEsClient();

    await search(createParams(esClient, { target: '  logs-*  ' }), loggerMock.create());

    expect(esqlQuery).toHaveBeenCalled();
    const [{ query }] = esqlQuery.mock.calls[0];
    // trimmed target and default limit (10) must appear in the generated query
    expect(query).toContain('FROM logs-*');
    expect(query).toContain('LIMIT 10');
  });
});
