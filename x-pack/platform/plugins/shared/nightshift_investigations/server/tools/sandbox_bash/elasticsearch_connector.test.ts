/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { ConnectorCallbackRequest, ConnectorCallbackResult } from './grpc_client';
import { handleElasticsearchCallback } from './elasticsearch_connector';

const createCallback = (
  subAction: string,
  params?: Record<string, unknown>
): ConnectorCallbackRequest => ({
  request_id: 'req-1',
  connector_id: 'elasticsearch',
  sub_action: subAction,
  sub_action_params:
    params === undefined ? Buffer.alloc(0) : Buffer.from(JSON.stringify(params), 'utf8'),
});

const parseData = (result: ConnectorCallbackResult): unknown => {
  expect(result.status).toBe('ok');
  expect(result.data).toBeInstanceOf(Buffer);
  return JSON.parse(result.data!.toString('utf8'));
};

describe('handleElasticsearchCallback', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createScopedClusterClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = elasticsearchServiceMock.createScopedClusterClient();
  });

  describe('esql', () => {
    const columnarResponse = {
      columns: [
        { name: 'service.name', type: 'keyword' as const },
        { name: 'count', type: 'long' as const },
      ],
      values: [
        ['checkout', 12],
        ['cart', 4],
      ],
    };

    beforeEach(() => {
      esClient.asCurrentUser.esql.query.mockResolvedValue(columnarResponse);
    });

    it('returns an array of record objects rather than the columnar ES|QL shape', async () => {
      const result = await handleElasticsearchCallback(
        createCallback('esql', { query: 'FROM logs-*' }),
        esClient
      );

      const rows = parseData(result);

      expect(Array.isArray(rows)).toBe(true);
      expect(rows).toEqual([
        { 'service.name': 'checkout', count: 12 },
        { 'service.name': 'cart', count: 4 },
      ]);
      // The raw columnar envelope must never reach stdout: the agent pipes this into jq/python.
      const serialized = result.data!.toString('utf8');
      expect(serialized.startsWith('[{')).toBe(true);
      expect(serialized).not.toContain('"columns"');
      expect(serialized).not.toContain('"values"');
    });

    it('applies an implicit limit of 100 when none is provided', async () => {
      await handleElasticsearchCallback(createCallback('esql', { query: 'FROM logs-*' }), esClient);

      const [request] = esClient.asCurrentUser.esql.query.mock.calls[0];
      expect(request.query).toContain('LIMIT 100');
    });

    it('honours an explicit limit', async () => {
      await handleElasticsearchCallback(
        createCallback('esql', { query: 'FROM logs-*', limit: 7 }),
        esClient
      );

      const [request] = esClient.asCurrentUser.esql.query.mock.calls[0];
      expect(request.query).toContain('LIMIT 7');
      expect(request.query).not.toContain('LIMIT 100');
    });

    it('forwards params and filter to the ES|QL request', async () => {
      const filter = { term: { 'service.name': 'checkout' } };

      await handleElasticsearchCallback(
        createCallback('esql', {
          query: 'FROM logs-* | WHERE host == ?host',
          params: [{ host: 'node-1' }],
          filter,
        }),
        esClient
      );

      const [request] = esClient.asCurrentUser.esql.query.mock.calls[0];
      expect(request.filter).toEqual(filter);
      expect(request.params).toEqual([{ host: 'node-1' }]);
    });

    it('returns an error result when the query parameter is missing', async () => {
      const result = await handleElasticsearchCallback(createCallback('esql', {}), esClient);

      expect(result).toEqual({
        status: 'error',
        error_message: expect.stringContaining("Missing required parameter 'query'"),
      });
      expect(esClient.asCurrentUser.esql.query).not.toHaveBeenCalled();
    });

    it('returns an error result when the query parameter is not a string', async () => {
      const result = await handleElasticsearchCallback(
        createCallback('esql', { query: 42 }),
        esClient
      );

      expect(result.status).toBe('error');
      expect(esClient.asCurrentUser.esql.query).not.toHaveBeenCalled();
    });

    it('returns an error result when no params are supplied at all', async () => {
      const result = await handleElasticsearchCallback(createCallback('esql'), esClient);

      expect(result.status).toBe('error');
    });

    it('caps oversized responses at 1 MiB instead of returning them', async () => {
      esClient.asCurrentUser.esql.query.mockResolvedValue({
        columns: [{ name: 'message', type: 'text' as const }],
        values: [['x'.repeat(1_100_000)]],
      });

      const result = await handleElasticsearchCallback(
        createCallback('esql', { query: 'FROM logs-*' }),
        esClient
      );

      expect(result).toEqual({
        status: 'error',
        error_message: expect.stringContaining('Response too large'),
      });
      expect(result.data).toBeUndefined();
    });
  });

  describe('resolve_index', () => {
    it('resolves the requested pattern and returns the raw response', async () => {
      const response = {
        indices: [{ name: 'logs-000001', attributes: ['open'] }],
        aliases: [],
        data_streams: [],
      };
      esClient.asCurrentUser.indices.resolveIndex.mockResolvedValue(response);

      const result = await handleElasticsearchCallback(
        createCallback('resolve_index', { pattern: 'logs-*' }),
        esClient
      );

      expect(esClient.asCurrentUser.indices.resolveIndex).toHaveBeenCalledWith({ name: 'logs-*' });
      expect(parseData(result)).toEqual(response);
    });

    it('caps oversized responses at 1 MiB', async () => {
      esClient.asCurrentUser.indices.resolveIndex.mockResolvedValue({
        indices: [{ name: 'x'.repeat(1_100_000), attributes: [] }],
        aliases: [],
        data_streams: [],
      });

      const result = await handleElasticsearchCallback(
        createCallback('resolve_index', { pattern: 'logs-*' }),
        esClient
      );

      expect(result).toEqual({
        status: 'error',
        error_message: expect.stringContaining('Response too large'),
      });
    });
  });

  describe('get_mapping', () => {
    const fieldCapsResponse = {
      indices: ['logs-000001'],
      fields: { '@timestamp': { date: { type: 'date', searchable: true, aggregatable: true } } },
    };

    beforeEach(() => {
      esClient.asCurrentUser.fieldCaps.mockResolvedValue(fieldCapsResponse);
    });

    it('uses field_caps with a wildcard field selection by default', async () => {
      const result = await handleElasticsearchCallback(
        createCallback('get_mapping', { pattern: 'logs-*' }),
        esClient
      );

      expect(esClient.asCurrentUser.fieldCaps).toHaveBeenCalledWith({
        index: 'logs-*',
        fields: '*',
        include_empty_fields: false,
      });
      expect(esClient.asCurrentUser.indices.getMapping).not.toHaveBeenCalled();
      expect(parseData(result)).toEqual(fieldCapsResponse);
    });

    it('narrows to the requested fields when provided', async () => {
      await handleElasticsearchCallback(
        createCallback('get_mapping', { pattern: 'logs-*', fields: 'host.*' }),
        esClient
      );

      expect(esClient.asCurrentUser.fieldCaps).toHaveBeenCalledWith(
        expect.objectContaining({ fields: 'host.*' })
      );
    });
  });

  describe('error handling', () => {
    it('rejects an unknown sub-action and lists the available ones', async () => {
      const result = await handleElasticsearchCallback(
        createCallback('delete_index', {}),
        esClient
      );

      expect(result.status).toBe('error');
      expect(result.error_message).toContain("Unknown sub-action 'delete_index'");
      expect(result.error_message).toContain('esql, resolve_index, get_mapping');
    });

    it('returns an error result for malformed sub_action_params JSON', async () => {
      const result = await handleElasticsearchCallback(
        {
          request_id: 'req-1',
          connector_id: 'elasticsearch',
          sub_action: 'esql',
          sub_action_params: Buffer.from('{not json', 'utf8'),
        },
        esClient
      );

      expect(result.status).toBe('error');
      expect(result.error_message).toContain('Invalid sub_action_params JSON');
    });

    it.each([
      ['esql', { query: 'FROM logs-*' }],
      ['resolve_index', { pattern: 'logs-*' }],
      ['get_mapping', { pattern: 'logs-*' }],
    ])('maps a throwing ES client to an error result for %s', async (subAction, params) => {
      const boom = new Error('security_exception: unauthorized');
      esClient.asCurrentUser.esql.query.mockRejectedValue(boom);
      esClient.asCurrentUser.indices.resolveIndex.mockRejectedValue(boom);
      esClient.asCurrentUser.fieldCaps.mockRejectedValue(boom);

      // A throw here would leave `sandbox-cb` hanging until the bash timeout.
      await expect(
        handleElasticsearchCallback(createCallback(subAction, params), esClient)
      ).resolves.toEqual({
        status: 'error',
        error_message: expect.stringContaining('security_exception: unauthorized'),
      });
    });
  });

  describe('privileges', () => {
    beforeEach(() => {
      esClient.asCurrentUser.esql.query.mockResolvedValue({ columns: [], values: [] });
      esClient.asCurrentUser.indices.resolveIndex.mockResolvedValue({
        indices: [],
        aliases: [],
        data_streams: [],
      });
      esClient.asCurrentUser.fieldCaps.mockResolvedValue({ indices: [], fields: {} });
    });

    it.each([
      ['esql', { query: 'FROM logs-*' }],
      ['resolve_index', { pattern: 'logs-*' }],
      ['get_mapping', { pattern: 'logs-*' }],
    ])('runs %s as the current user and never as the internal user', async (subAction, params) => {
      const result = await handleElasticsearchCallback(createCallback(subAction, params), esClient);

      expect(result.status).toBe('ok');
      expect(esClient.asInternalUser.esql.query).not.toHaveBeenCalled();
      expect(esClient.asInternalUser.indices.resolveIndex).not.toHaveBeenCalled();
      expect(esClient.asInternalUser.fieldCaps).not.toHaveBeenCalled();
    });

    it('issues the esql request through asCurrentUser', async () => {
      await handleElasticsearchCallback(createCallback('esql', { query: 'FROM logs-*' }), esClient);

      expect(esClient.asCurrentUser.esql.query).toHaveBeenCalledTimes(1);
    });

    it('issues the resolve_index request through asCurrentUser', async () => {
      await handleElasticsearchCallback(
        createCallback('resolve_index', { pattern: 'logs-*' }),
        esClient
      );

      expect(esClient.asCurrentUser.indices.resolveIndex).toHaveBeenCalledTimes(1);
    });

    it('issues the get_mapping request through asCurrentUser', async () => {
      await handleElasticsearchCallback(
        createCallback('get_mapping', { pattern: 'logs-*' }),
        esClient
      );

      expect(esClient.asCurrentUser.fieldCaps).toHaveBeenCalledTimes(1);
    });
  });
});
