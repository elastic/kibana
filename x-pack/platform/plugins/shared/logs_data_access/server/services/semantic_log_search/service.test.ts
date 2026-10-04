/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { errors } from '@elastic/elasticsearch';
import type { SemanticLogSearchParams } from '../../../common/services/semantic_log_search/types';
import { search } from './service';
import {
  MAX_EPOCH_MS,
  MAX_KQL_FILTER_LENGTH,
  MAX_NL_QUERY_LENGTH,
  MAX_PATTERNS,
  MAX_TARGET_LENGTH,
} from './constants';
import { searchDeps } from './test_helpers';

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
  const fieldCaps = jest.fn().mockResolvedValue({
    indices: ['.ds-logs-synth-default-000001'],
    fields,
  });
  const notFoundError = new errors.ResponseError({
    body: { error: { type: 'resource_not_found_exception' } },
    statusCode: 404,
    headers: {},
    meta: {} as any,
    warnings: [],
  });
  const inferenceGet = rerankAvailable
    ? jest.fn().mockResolvedValue({ endpoints: [{ inference_id: '.rerank-v1-elasticsearch' }] })
    : jest.fn().mockRejectedValue(notFoundError);
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

    const result = await search(createParams(esClient), searchDeps());

    expect(result).toEqual({ status: 'success', patterns: [] });
  });

  it('returns missing_fields without checking inference or running ES|QL', async () => {
    const { esClient, inferenceGet, esqlQuery } = createEsClient({
      fields: {
        '@timestamp': { date: { type: 'date', searchable: true, aggregatable: true } },
      },
    });

    const result = await search(createParams(esClient), searchDeps());

    expect(result).toEqual({ status: 'unavailable', reason: 'missing_fields' });
    expect(inferenceGet).not.toHaveBeenCalled();
    expect(esqlQuery).not.toHaveBeenCalled();
  });

  it('returns inference_unavailable without running ES|QL', async () => {
    const { esClient, esqlQuery } = createEsClient({ rerankAvailable: false });

    const result = await search(createParams(esClient), searchDeps());

    expect(result).toEqual({ status: 'unavailable', reason: 'inference_unavailable' });
    expect(esqlQuery).not.toHaveBeenCalled();
  });

  it('checks the configured endpoint for availability, not the default', async () => {
    const { esClient, inferenceGet } = createEsClient();

    await search(createParams(esClient), {
      logger: loggerMock.create(),
      rerankInferenceId: '.jina-reranker-v3',
    });

    expect(inferenceGet).toHaveBeenCalledWith({ inference_id: '.jina-reranker-v3' });
  });

  it('names the configured endpoint in the log when it is absent, so a typo is diagnosable', async () => {
    // The tool response carries a fixed reason whose warning tells the model not to retry, so a
    // misconfigured id is indistinguishable from a cluster without reranking except here.
    const logger = loggerMock.create();
    const { esClient } = createEsClient({ rerankAvailable: false });

    const result = await search(createParams(esClient), {
      logger,
      rerankInferenceId: '.rerank-v1-elasticsaerch',
    });

    expect(result).toEqual({ status: 'unavailable', reason: 'inference_unavailable' });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('.rerank-v1-elasticsaerch'));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('rerankInferenceId'));
  });

  it('stays quiet when the default endpoint is the one missing, which is not a misconfiguration', async () => {
    const logger = loggerMock.create();
    const { esClient } = createEsClient({ rerankAvailable: false });

    await search(createParams(esClient), searchDeps(logger));

    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('returns execution error when the field capability check fails, naming the phase', async () => {
    // A 403 must stay an execution failure: only a 404 means the target is absent.
    const logger = loggerMock.create();
    const { esClient, fieldCaps } = createEsClient();
    fieldCaps.mockRejectedValue(new Error('forbidden'));

    const result = await search(createParams(esClient), searchDeps(logger));

    expect(result).toEqual({
      status: 'error',
      reason: 'execution',
      diagnostics: { phase: 'capabilities', elasticsearchErrorType: 'Error' },
    });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('capability check'));
  });

  it('reports no_matching_indices when the target resolves to nothing', async () => {
    const { esClient, fieldCaps, esqlQuery } = createEsClient();
    fieldCaps.mockResolvedValue({ indices: [], fields: {} });

    const result = await search(createParams(esClient), searchDeps());

    expect(result).toEqual({ status: 'unavailable', reason: 'no_matching_indices' });
    expect(esqlQuery).not.toHaveBeenCalled();
  });

  it('returns cancelled when the capability check is aborted by the caller', async () => {
    // Previously every capability-check failure returned `execution`; aborts are now
    // correctly classified as `cancelled` and logged at debug rather than warn.
    const logger = loggerMock.create();
    const { esClient, fieldCaps } = createEsClient();
    const abortError = Object.assign(new Error('aborted'), { name: 'AbortError' });
    fieldCaps.mockRejectedValue(abortError);

    const result = await search(createParams(esClient), searchDeps(logger));

    expect(result).toEqual({
      status: 'error',
      reason: 'cancelled',
      diagnostics: { phase: 'capabilities', elasticsearchErrorType: 'AbortError' },
    });
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('cancelled'));
    expect(logger.warn).not.toHaveBeenCalled();
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
    // whitespace — ES|QL accepts \n, \r, \t as token separators
    { target: 'logs-*\nMETADATA\n_id' },
    { target: 'logs-*\rMETADATA\r_id' },
    { target: 'logs-*\tMETADATA\t_id' },
    // backtick is the ES|QL identifier quote character; `logs-*` would parse as a quoted source
    { target: '`logs-*`' },
    // over-length inputs
    { nlQuery: 'x'.repeat(MAX_NL_QUERY_LENGTH + 1) },
    { kqlFilter: 'x'.repeat(MAX_KQL_FILTER_LENGTH + 1) },
    { target: 'x'.repeat(MAX_TARGET_LENGTH + 1) },
    // epoch overflow: MAX_EPOCH_MS is the ECMA-262 limit; MAX_SAFE_INTEGER exceeds it
    { timeRange: { start: 0, end: MAX_EPOCH_MS + 1 } },
    { timeRange: { start: 0, end: Number.MAX_SAFE_INTEGER } },
    { timeRange: { start: -MAX_EPOCH_MS - 1, end: 1 } },
  ])('rejects invalid params before Elasticsearch work: %o', async (overrides) => {
    const { esClient, fieldCaps, inferenceGet, esqlQuery } = createEsClient();

    const result = await search(
      createParams(esClient, overrides as Partial<SemanticLogSearchParams>),
      searchDeps()
    );

    expect(result).toEqual({ status: 'error', reason: 'invalid_params' });
    expect(fieldCaps).not.toHaveBeenCalled();
    expect(inferenceGet).not.toHaveBeenCalled();
    expect(esqlQuery).not.toHaveBeenCalled();
  });

  it.each([
    // single index patterns
    'logs-*',
    'my_index',
    '.ds-logs-2024.01.01-000001',
    'logs-generic-default',
    'metrics-*-*',
    '*',
    'idx+1',
    // comma-separated multi-index patterns
    'logs-*,filebeat-*',
    // cluster-prefixed remote patterns
    'remote:logs-*',
    'cluster-a:logs-*,cluster-b:logs-*',
    // TSDB data / failures selectors
    'logs-*::data',
    // exclusion prefix
    'logs-*,-logs-debug-*',
  ])('accepts the legitimate target %s and forwards it to Elasticsearch', async (target) => {
    const { esClient, esqlQuery } = createEsClient();

    const result = await search(createParams(esClient, { target }), searchDeps());

    // The schema accepts this target; ES|QL query runs (empty mock response → success)
    expect(result.status).toBe('success');
    expect(esqlQuery).toHaveBeenCalled();
    const [{ query }] = esqlQuery.mock.calls[0];
    // Each comma-separated part must appear in the emitted query. The composer adds a space
    // after commas (`FROM a, b`) so checking the raw target verbatim is intentionally avoided.
    for (const part of target.split(',')) {
      expect(query).toContain(part.trim());
    }
  });

  it('trims whitespace from target before forwarding to the ES|QL strategy', async () => {
    const { esClient, esqlQuery } = createEsClient();

    await search(createParams(esClient, { target: '  logs-*  ' }), searchDeps());

    expect(esqlQuery).toHaveBeenCalled();
    const [{ query }] = esqlQuery.mock.calls[0];
    // The trimmed target must appear in the count probe (first ES|QL call). maxPatterns is now
    // applied in JavaScript after the inference rerank rather than as an ES|QL LIMIT clause.
    expect(query).toContain('FROM logs-*');
  });
});
