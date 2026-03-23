/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import {
  listRules,
  updateRule,
  deleteRule,
  bulkDeleteRules,
  bulkEnableRules,
  bulkDisableRules,
} from './rules_api';

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
        query: { page: 1, perPage: 10, search: undefined },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should pass search param when provided', async () => {
      http.get.mockResolvedValue({ items: [], total: 0, page: 1, perPage: 10 });

      await listRules(http, { page: 1, perPage: 10, search: 'test query' });

      expect(http.get).toHaveBeenCalledWith('/internal/alerting/v2/rule', {
        query: { page: 1, perPage: 10, search: 'test query' },
      });
    });

    it('should handle optional pagination params', async () => {
      http.get.mockResolvedValue({ items: [], total: 0 });

      await listRules(http, {});

      expect(http.get).toHaveBeenCalledWith('/internal/alerting/v2/rule', {
        query: { page: undefined, perPage: undefined, search: undefined },
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

  describe('bulkDeleteRules', () => {
    it('should call http.post with ids', async () => {
      http.post.mockResolvedValue({ rules: [], errors: [] });

      await bulkDeleteRules(http, { ids: ['a', 'b'] });

      expect(http.post).toHaveBeenCalledWith('/internal/alerting/v2/rule/_bulk_delete', {
        body: JSON.stringify({ ids: ['a', 'b'] }),
      });
    });

    it('should call http.post with filter', async () => {
      http.post.mockResolvedValue({ rules: [], errors: [] });

      await bulkDeleteRules(http, { filter: 'NOT (id: "x")' });

      expect(http.post).toHaveBeenCalledWith('/internal/alerting/v2/rule/_bulk_delete', {
        body: JSON.stringify({ filter: 'NOT (id: "x")' }),
      });
    });
  });

  describe('bulkEnableRules', () => {
    it('should call http.post with the correct path', async () => {
      http.post.mockResolvedValue({ rules: [], errors: [] });

      await bulkEnableRules(http, { ids: ['a'] });

      expect(http.post).toHaveBeenCalledWith('/internal/alerting/v2/rule/_bulk_enable', {
        body: JSON.stringify({ ids: ['a'] }),
      });
    });
  });

  describe('bulkDisableRules', () => {
    it('should call http.post with the correct path', async () => {
      http.post.mockResolvedValue({ rules: [], errors: [] });

      await bulkDisableRules(http, { ids: ['a'] });

      expect(http.post).toHaveBeenCalledWith('/internal/alerting/v2/rule/_bulk_disable', {
        body: JSON.stringify({ ids: ['a'] }),
      });
    });
  });
});
