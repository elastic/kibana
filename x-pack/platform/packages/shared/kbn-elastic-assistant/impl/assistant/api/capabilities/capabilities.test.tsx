/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core-http-browser';

import { getCapabilities } from './capabilities';
import { API_ERROR } from '../../translations';

jest.mock('@kbn/core-http-browser');

const mockHttp = {
  get: jest.fn(),
} as unknown as HttpSetup;

describe('Capabilities API tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCapabilities', () => {
    it('calls the internal assistant API for fetching assistant capabilities', async () => {
      await getCapabilities({ http: mockHttp });

      expect(mockHttp.get).toHaveBeenCalledWith('/internal/elastic_assistant/capabilities', {
        signal: undefined,
        version: '1',
      });
    });

    it('returns API_ERROR when the response status is error', async () => {
      (mockHttp.get as jest.Mock).mockResolvedValue({ status: API_ERROR });

      const result = await getCapabilities({ http: mockHttp });

      expect(result).toEqual({ status: API_ERROR });
    });
  });
});
