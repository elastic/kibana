/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fetchMappings } from './helpers';
import { mockMappingsResponse } from '../mock/mappings_response/mock_mappings_response';

describe('helpers', () => {
  let originalFetch: typeof global['fetch'];

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  describe('fetchMappings', () => {
    test('it returns the expected mappings', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMappingsResponse),
      });
      global.fetch = mockFetch;

      const result = await fetchMappings({
        abortController: new AbortController(),
        patternOrIndexName: 'auditbeat-custom-index-1',
      });

      expect(result).toEqual({
        'auditbeat-custom-index-1': {
          mappings: {
            properties: {
              '@timestamp': { type: 'date' },
              event: { properties: { category: { ignore_above: 1024, type: 'keyword' } } },
              host: {
                properties: {
                  name: {
                    fields: { keyword: { ignore_above: 256, type: 'keyword' } },
                    type: 'text',
                  },
                },
              },
              some: {
                properties: {
                  field: {
                    fields: { keyword: { ignore_above: 256, type: 'keyword' } },
                    type: 'text',
                  },
                },
              },
              source: {
                properties: {
                  ip: { fields: { keyword: { ignore_above: 256, type: 'keyword' } }, type: 'text' },
                  port: { type: 'long' },
                },
              },
            },
          },
        },
      });
    });

    test('it throws the expected error when fetch fails', async () => {
      const error = 'simulated error';
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        statusText: error,
      });

      global.fetch = mockFetch;

      await expect(
        fetchMappings({
          abortController: new AbortController(),
          patternOrIndexName: 'auditbeat-custom-index-1',
        })
      ).rejects.toThrowError(
        'Error loading mappings for auditbeat-custom-index-1: simulated error'
      );
    });
  });
});
