/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { KibanaRequest } from '@kbn/core-http-server';
import { V2RulesHttpClient } from './v2_rules_http_client';
import type { CreateRuleBody, UpdateRuleBody } from './rules_management_client';
import { STREAMS_RULE_CONSUMER, STREAMS_ESQL_RULE_TYPE_ID } from './rules_management_client';

const mockFetch = jest.fn();
jest.mock('node-fetch', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockFetch(...args),
}));

const logger = loggerMock.create();

const serverInfo = { protocol: 'http' as const, hostname: 'localhost', port: 5601 };
const basePath = '/my-base';

function makeRequest(overrides: Partial<KibanaRequest['headers']> = {}): KibanaRequest {
  return {
    headers: {
      authorization: 'Bearer test-token',
      cookie: 'sid=abc',
      ...overrides,
    },
  } as unknown as KibanaRequest;
}

function makeClient(request = makeRequest()) {
  return new V2RulesHttpClient(request, serverInfo, basePath, logger);
}

function lastFetchBody(): unknown {
  const [, opts] = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
  return JSON.parse(opts.body);
}

function lastFetchUrl(): string {
  return mockFetch.mock.calls[mockFetch.mock.calls.length - 1][0];
}

const createBody: CreateRuleBody = {
  name: 'High error rate',
  consumer: STREAMS_RULE_CONSUMER,
  alertTypeId: STREAMS_ESQL_RULE_TYPE_ID,
  actions: [] as never[],
  params: {
    timestampField: '@timestamp',
    query: 'FROM logs-* METADATA _id, _source | WHERE level == "error"',
  },
  enabled: true,
  tags: ['streams', 'my-stream'],
  schedule: { interval: '1m' },
};

const updateBody: UpdateRuleBody = {
  name: 'Updated title',
  actions: [] as never[],
  params: {
    timestampField: '@timestamp',
    query: 'FROM logs-* METADATA _id, _source | WHERE level == "error"',
  },
  tags: ['streams', 'my-stream'],
  schedule: { interval: '1m' },
};

describe('V2RulesHttpClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true, status: 200 });
  });

  describe('v2 body mapping', () => {
    it('maps createRule body to v2 signal shape', async () => {
      const client = makeClient();
      await client.createRule('rule-1', createBody);

      expect(lastFetchBody()).toEqual({
        kind: 'signal',
        metadata: {
          name: 'High error rate',
          tags: ['sigevents:stream:my-stream'],
        },
        time_field: '@timestamp',
        schedule: { every: '1m', lookback: '2m' },
        grouping: { fields: ['_id'] },
        evaluation: { query: { base: 'FROM logs-* METADATA _id | WHERE level == "error"' } },
      });
    });

    it('includes a 2-minute lookback to match v1 MATCH_LOOKBACK_MINUTES', async () => {
      const client = makeClient();
      await client.createRule('rule-1', createBody);

      const body = lastFetchBody() as Record<string, unknown>;
      expect((body.schedule as Record<string, unknown>).lookback).toBe('2m');
    });

    it('groups by _id so overlapping windows dedupe per source document', async () => {
      const client = makeClient();
      await client.createRule('rule-1', createBody);

      const body = lastFetchBody() as { grouping: { fields: string[] } };
      expect(body.grouping).toEqual({ fields: ['_id'] });
    });

    it('maps updateRule body to v2 partial shape (no kind or time_field)', async () => {
      const client = makeClient();
      await client.updateRule('rule-1', updateBody);

      expect(lastFetchBody()).toEqual({
        metadata: {
          name: 'Updated title',
          tags: ['sigevents:stream:my-stream'],
        },
        schedule: { every: '1m', lookback: '2m' },
        grouping: { fields: ['_id'] },
        evaluation: { query: { base: 'FROM logs-* METADATA _id | WHERE level == "error"' } },
      });
    });

    it('keeps grouping in updateRule bodies so dedup config stays in sync', async () => {
      const client = makeClient();
      await client.updateRule('rule-1', updateBody);

      const body = lastFetchBody() as { grouping: { fields: string[] } };
      expect(body.grouping).toEqual({ fields: ['_id'] });
    });

    it('maps v1 tags ["streams", "<name>"] to a single structured v2 tag', async () => {
      const client = makeClient();
      await client.createRule('rule-1', {
        ...createBody,
        tags: ['streams', 'web-server.errors'],
      });

      const body = lastFetchBody() as { metadata: { tags: string[] } };
      expect(body.metadata.tags).toEqual(['sigevents:stream:web-server.errors']);
    });

    it('preserves v1 tags as-is when no stream name is present', async () => {
      const client = makeClient();
      await client.createRule('rule-1', { ...createBody, tags: ['streams'] });

      const body = lastFetchBody() as { metadata: { tags: string[] } };
      expect(body.metadata.tags).toEqual(['streams']);
    });

    it('strips _source from METADATA but keeps _id so v2 grouping can dedupe per document', async () => {
      const client = makeClient();
      await client.createRule('rule-1', {
        ...createBody,
        params: {
          timestampField: '@timestamp',
          query: 'FROM logs.child,logs.child.* METADATA _id, _source | WHERE KQL("message: error")',
        },
      });

      const body = lastFetchBody() as { evaluation: { query: { base: string } } };
      expect(body.evaluation.query.base).toBe(
        'FROM logs.child, logs.child.* METADATA _id | WHERE KQL("message: error")'
      );
    });

    it('strips _source from updateRule queries while keeping _id', async () => {
      const client = makeClient();
      await client.updateRule('rule-1', {
        ...updateBody,
        params: {
          timestampField: '@timestamp',
          query: 'FROM logs-* METADATA _id, _source | WHERE level == "error"',
        },
      });

      const body = lastFetchBody() as { evaluation: { query: { base: string } } };
      expect(body.evaluation.query.base).toBe(
        'FROM logs-* METADATA _id | WHERE level == "error"'
      );
    });

    it('leaves queries without METADATA unchanged', async () => {
      const client = makeClient();
      await client.createRule('rule-1', {
        ...createBody,
        params: {
          timestampField: '@timestamp',
          query: 'FROM logs-* | WHERE level == "error"',
        },
      });

      const body = lastFetchBody() as { evaluation: { query: { base: string } } };
      expect(body.evaluation.query.base).toBe('FROM logs-* | WHERE level == "error"');
    });
  });

  describe('URL construction', () => {
    it('builds the URL from serverInfo + basePath', async () => {
      const client = makeClient();
      await client.createRule('rule-1', createBody);

      expect(lastFetchUrl()).toBe('http://localhost:5601/my-base/api/alerting/v2/rules/rule-1');
    });

    it('encodes the rule id in the URL', async () => {
      const client = makeClient();
      await client.createRule('rule/with spaces', createBody);

      expect(lastFetchUrl()).toBe(
        'http://localhost:5601/my-base/api/alerting/v2/rules/rule%2Fwith%20spaces'
      );
    });
  });

  describe('createRule', () => {
    it('sends a POST request', async () => {
      const client = makeClient();
      await client.createRule('rule-1', createBody);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][1].method).toBe('POST');
    });

    it('falls back to PATCH on 409 conflict', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 409, text: async () => 'conflict' })
        .mockResolvedValueOnce({ ok: true, status: 200 });

      const client = makeClient();
      await client.createRule('rule-1', createBody);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch.mock.calls[1][1].method).toBe('PATCH');
    });

    it('throws on non-409 errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'server error',
      });

      const client = makeClient();
      await expect(client.createRule('rule-1', createBody)).rejects.toThrow(
        'V2 create rule rule-1 failed with status 500'
      );
    });
  });

  describe('updateRule', () => {
    it('sends a PATCH request', async () => {
      const client = makeClient();
      await client.updateRule('rule-1', updateBody);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][1].method).toBe('PATCH');
    });

    it('falls back to POST on 404 not found', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 404, text: async () => 'not found' })
        .mockResolvedValueOnce({ ok: true, status: 201 });

      const client = makeClient();
      await client.updateRule('rule-1', updateBody);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch.mock.calls[1][1].method).toBe('POST');
    });

    it('throws on non-404 errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => 'forbidden',
      });

      const client = makeClient();
      await expect(client.updateRule('rule-1', updateBody)).rejects.toThrow(
        'V2 update rule rule-1 failed with status 403'
      );
    });
  });

  describe('bulkDeleteRules', () => {
    it('sends a POST to _bulk_delete', async () => {
      const client = makeClient();
      await client.bulkDeleteRules(['id-1', 'id-2']);

      expect(lastFetchUrl()).toBe(
        'http://localhost:5601/my-base/api/alerting/v2/rules/_bulk_delete'
      );
      expect(lastFetchBody()).toEqual({ ids: ['id-1', 'id-2'] });
    });

    it('is a no-op for an empty array', async () => {
      const client = makeClient();
      await client.bulkDeleteRules([]);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('treats 404 as benign', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404, text: async () => '' });

      const client = makeClient();
      await expect(client.bulkDeleteRules(['id-1'])).resolves.toBeUndefined();
    });

    it('throws on non-404 errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'storage failure',
      });

      const client = makeClient();
      await expect(client.bulkDeleteRules(['id-1'])).rejects.toThrow(
        'V2 bulk delete failed with status 500'
      );
    });
  });

  describe('auth headers', () => {
    it('forwards authorization and cookie headers from the request', async () => {
      const client = makeClient();
      await client.createRule('rule-1', createBody);

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers.authorization).toBe('Bearer test-token');
      expect(headers.cookie).toBe('sid=abc');
      expect(headers['kbn-xsrf']).toBe('true');
    });

    it('works without authorization or cookie headers', async () => {
      const client = makeClient(makeRequest({ authorization: undefined, cookie: undefined }));
      await client.createRule('rule-1', createBody);

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers.authorization).toBeUndefined();
      expect(headers.cookie).toBeUndefined();
      expect(headers['kbn-xsrf']).toBe('true');
    });
  });
});
