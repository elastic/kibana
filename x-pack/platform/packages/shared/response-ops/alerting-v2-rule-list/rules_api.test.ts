/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import { listRules, updateRule, deleteRule } from './rules_api';

const createMockHttp = (): jest.Mocked<HttpStart> =>
  ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  } as unknown as jest.Mocked<HttpStart>);

describe('rules_api', () => {
  let http: jest.Mocked<HttpStart>;

  beforeEach(() => {
    http = createMockHttp();
  });

  describe('listRules', () => {
    it('should call http.get with the correct path and query params', async () => {
      const mockResponse = { items: [], total: 0, page: 1, perPage: 10 };
      http.get.mockResolvedValue(mockResponse);

      const result = await listRules(http, { page: 1, perPage: 10 });

      expect(http.get).toHaveBeenCalledWith('/internal/alerting/v2/rule', {
        query: { page: 1, perPage: 10 },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle optional pagination params', async () => {
      http.get.mockResolvedValue({ items: [], total: 0 });

      await listRules(http, {});

      expect(http.get).toHaveBeenCalledWith('/internal/alerting/v2/rule', {
        query: { page: undefined, perPage: undefined },
      });
    });
  });

  describe('updateRule', () => {
    it('should call http.patch with the correct path and body', async () => {
      const mockRule = { id: 'rule-1', enabled: true };
      http.patch.mockResolvedValue(mockRule);

      const result = await updateRule(http, 'rule-1', { enabled: true });

      expect(http.patch).toHaveBeenCalledWith('/internal/alerting/v2/rule/rule-1', {
        body: JSON.stringify({ enabled: true }),
      });
      expect(result).toEqual(mockRule);
    });
  });

  describe('deleteRule', () => {
    it('should call http.delete with the correct path', async () => {
      http.delete.mockResolvedValue(undefined);

      await deleteRule(http, 'rule-1');

      expect(http.delete).toHaveBeenCalledWith('/internal/alerting/v2/rule/rule-1');
    });
  });
});
