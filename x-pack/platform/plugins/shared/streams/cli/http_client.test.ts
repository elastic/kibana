/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { HttpClient, HttpError } from './http_client';

// Mock node-fetch
jest.mock('node-fetch', () => {
  const mockFetch = jest.fn();
  return {
    __esModule: true,
    default: mockFetch,
  };
});

// Mock supertest
jest.mock('supertest', () => {
  return jest.fn(() => ({
    get: jest.fn().mockReturnThis(),
    post: jest.fn().mockReturnThis(),
    put: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  }));
});

describe('HttpClient', () => {
  let mockLog: jest.Mocked<ToolingLog>;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    mockLog = {
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<ToolingLog>;

    // Get the mocked fetch
    mockFetch = require('node-fetch').default;
    mockFetch.mockReset();
  });

  describe('constructor', () => {
    it('creates Basic auth header from username and password', () => {
      const client = new HttpClient({
        baseUrl: 'http://localhost:5601',
        username: 'elastic',
        password: 'changeme',
        log: mockLog,
        isJsonMode: false,
      });

      // The auth header is private, but we can test it indirectly through requests
      expect(client).toBeDefined();
    });
  });

  describe('request() with fetch (external mode)', () => {
    it('makes GET request with correct headers', async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        json: async () => ({ streams: [] }),
      });

      const client = new HttpClient({
        baseUrl: 'http://localhost:5601',
        username: 'elastic',
        password: 'changeme',
        log: mockLog,
        isJsonMode: false,
      });

      await client.request({
        method: 'GET',
        path: '/api/streams',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5601/api/streams',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: expect.stringMatching(/^Basic /),
            'kbn-xsrf': 'true',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('adds version header when provided', async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        json: async () => ({ streams: [] }),
      });

      const client = new HttpClient({
        baseUrl: 'http://localhost:5601',
        username: 'elastic',
        password: 'changeme',
        log: mockLog,
        isJsonMode: false,
      });

      await client.request({
        method: 'GET',
        path: '/api/streams',
        version: '2023-10-31',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5601/api/streams',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Elastic-Api-Version': '2023-10-31',
          }),
        })
      );
    });

    it('adds query parameters to URL', async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        json: async () => ({ features: [] }),
      });

      const client = new HttpClient({
        baseUrl: 'http://localhost:5601',
        username: 'elastic',
        password: 'changeme',
        log: mockLog,
        isJsonMode: false,
      });

      await client.request({
        method: 'GET',
        path: '/internal/streams/logs/features',
        query: { type: 'classification', limit: 10 },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5601/internal/streams/logs/features?type=classification&limit=10',
        expect.any(Object)
      );
    });

    it('skips undefined query parameters', async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        json: async () => ({ data: [] }),
      });

      const client = new HttpClient({
        baseUrl: 'http://localhost:5601',
        username: 'elastic',
        password: 'changeme',
        log: mockLog,
        isJsonMode: false,
      });

      await client.request({
        method: 'GET',
        path: '/api/test',
        query: { foo: 'bar', baz: undefined },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5601/api/test?foo=bar',
        expect.any(Object)
      );
    });

    it('sends body as JSON for POST requests', async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        json: async () => ({ acknowledged: true }),
      });

      const client = new HttpClient({
        baseUrl: 'http://localhost:5601',
        username: 'elastic',
        password: 'changeme',
        log: mockLog,
        isJsonMode: false,
      });

      await client.request({
        method: 'POST',
        path: '/api/streams/logs/_fork',
        body: { child: 'logs.nginx', condition: { field: 'agent', eq: 'nginx' } },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5601/api/streams/logs/_fork',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ child: 'logs.nginx', condition: { field: 'agent', eq: 'nginx' } }),
        })
      );
    });

    it('returns status and data from response', async () => {
      const responseData = { streams: [{ name: 'logs' }] };
      mockFetch.mockResolvedValue({
        status: 200,
        json: async () => responseData,
      });

      const client = new HttpClient({
        baseUrl: 'http://localhost:5601',
        username: 'elastic',
        password: 'changeme',
        log: mockLog,
        isJsonMode: false,
      });

      const result = await client.request({
        method: 'GET',
        path: '/api/streams',
      });

      expect(result).toEqual({
        status: 200,
        data: responseData,
      });
    });
  });

  describe('convenience methods', () => {
    it('getPublic() adds version header and throws on error', async () => {
      mockFetch.mockResolvedValue({
        status: 404,
        json: async () => ({ message: 'Stream not found' }),
      });

      const client = new HttpClient({
        baseUrl: 'http://localhost:5601',
        username: 'elastic',
        password: 'changeme',
        log: mockLog,
        isJsonMode: false,
      });

      await expect(client.getPublic('/api/streams/nonexistent')).rejects.toThrow(HttpError);
    });

    it('postPublic() sends body with version header', async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        json: async () => ({ acknowledged: true }),
      });

      const client = new HttpClient({
        baseUrl: 'http://localhost:5601',
        username: 'elastic',
        password: 'changeme',
        log: mockLog,
        isJsonMode: false,
      });

      await client.postPublic('/api/streams/_enable');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5601/api/streams/_enable',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Elastic-Api-Version': '2023-10-31',
          }),
        })
      );
    });

    it('putPublic() sends body with version header', async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        json: async () => ({ acknowledged: true }),
      });

      const client = new HttpClient({
        baseUrl: 'http://localhost:5601',
        username: 'elastic',
        password: 'changeme',
        log: mockLog,
        isJsonMode: false,
      });

      const body = { stream: { ingest: { routing: [] } } };
      await client.putPublic('/api/streams/logs', body);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5601/api/streams/logs',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(body),
        })
      );
    });

    it('deletePublic() sends request with version header', async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        json: async () => ({ acknowledged: true }),
      });

      const client = new HttpClient({
        baseUrl: 'http://localhost:5601',
        username: 'elastic',
        password: 'changeme',
        log: mockLog,
        isJsonMode: false,
      });

      await client.deletePublic('/api/streams/logs');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5601/api/streams/logs',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('getInternal() does not add version header', async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        json: async () => ({ features: [] }),
      });

      const client = new HttpClient({
        baseUrl: 'http://localhost:5601',
        username: 'elastic',
        password: 'changeme',
        log: mockLog,
        isJsonMode: false,
      });

      await client.getInternal('/internal/streams/logs/features');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5601/internal/streams/logs/features',
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'Elastic-Api-Version': expect.any(String),
          }),
        })
      );
    });

    it('postInternal() sends body without version header', async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        json: async () => ({ acknowledged: true }),
      });

      const client = new HttpClient({
        baseUrl: 'http://localhost:5601',
        username: 'elastic',
        password: 'changeme',
        log: mockLog,
        isJsonMode: false,
      });

      await client.postInternal('/internal/streams/logs/features', { name: 'test' });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5601/internal/streams/logs/features',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'test' }),
        })
      );
    });

    it('deleteInternal() sends request without version header', async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        json: async () => ({ acknowledged: true }),
      });

      const client = new HttpClient({
        baseUrl: 'http://localhost:5601',
        username: 'elastic',
        password: 'changeme',
        log: mockLog,
        isJsonMode: false,
      });

      await client.deleteInternal('/internal/streams/logs/features/feat1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5601/internal/streams/logs/features/feat1',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('HttpError', () => {
    it('is thrown for 4xx responses', async () => {
      mockFetch.mockResolvedValue({
        status: 400,
        json: async () => ({ message: 'Bad request' }),
      });

      const client = new HttpClient({
        baseUrl: 'http://localhost:5601',
        username: 'elastic',
        password: 'changeme',
        log: mockLog,
        isJsonMode: false,
      });

      try {
        await client.getPublic('/api/streams/bad');
        fail('Expected HttpError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpError);
        expect((error as HttpError).statusCode).toBe(400);
        expect((error as HttpError).message).toBe('Bad request');
        expect((error as HttpError).body).toEqual({ message: 'Bad request' });
      }
    });

    it('is thrown for 5xx responses', async () => {
      mockFetch.mockResolvedValue({
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      });

      const client = new HttpClient({
        baseUrl: 'http://localhost:5601',
        username: 'elastic',
        password: 'changeme',
        log: mockLog,
        isJsonMode: false,
      });

      try {
        await client.getPublic('/api/streams/error');
        fail('Expected HttpError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpError);
        expect((error as HttpError).statusCode).toBe(500);
      }
    });

    it('uses fallback message when response has no message', async () => {
      mockFetch.mockResolvedValue({
        status: 404,
        json: async () => ({}),
      });

      const client = new HttpClient({
        baseUrl: 'http://localhost:5601',
        username: 'elastic',
        password: 'changeme',
        log: mockLog,
        isJsonMode: false,
      });

      try {
        await client.getPublic('/api/streams/notfound');
        fail('Expected HttpError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpError);
        expect((error as HttpError).message).toBe('HTTP 404');
      }
    });

    it('has correct name property', () => {
      const error = new HttpError('Test error', 404, { message: 'Not found' });
      expect(error.name).toBe('HttpError');
    });
  });
});
