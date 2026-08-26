/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { RuleChangeHistoryApi } from './rule_change_history_api';

describe('RuleChangeHistoryApi', () => {
  const buildApi = () => {
    const http = httpServiceMock.createStartContract();
    http.get.mockResolvedValue({ items: [], total: 0 });
    const api = new RuleChangeHistoryApi(http);
    return { api, http };
  };

  describe('listRuleChanges', () => {
    it('GETs the encoded rule history endpoint', async () => {
      const { api, http } = buildApi();

      await api.listRuleChanges({ id: 'rule-1' });

      expect(http.get).toHaveBeenCalledWith(
        '/api/alerting/v2/rules/rule-1/history',
        expect.any(Object)
      );
    });

    it('encodes the rule id path parameter', async () => {
      const { api, http } = buildApi();

      await api.listRuleChanges({ id: 'a/b c' });

      expect(http.get).toHaveBeenCalledWith(
        '/api/alerting/v2/rules/a%2Fb%20c/history',
        expect.any(Object)
      );
    });

    it('forwards page and perPage as snake-cased query params', async () => {
      const { api, http } = buildApi();

      await api.listRuleChanges({ id: 'rule-1', page: 2, perPage: 25 });

      expect(http.get).toHaveBeenCalledWith('/api/alerting/v2/rules/rule-1/history', {
        query: { page: 2, per_page: 25 },
        signal: undefined,
      });
    });

    it('passes undefined query params when not provided', async () => {
      const { api, http } = buildApi();

      await api.listRuleChanges({ id: 'rule-1' });

      expect(http.get).toHaveBeenCalledWith('/api/alerting/v2/rules/rule-1/history', {
        query: { page: undefined, per_page: undefined },
        signal: undefined,
      });
    });

    it('forwards the abort signal', async () => {
      const { api, http } = buildApi();
      const signal = new AbortController().signal;

      await api.listRuleChanges({ id: 'rule-1', signal });

      expect(http.get).toHaveBeenCalledWith(
        '/api/alerting/v2/rules/rule-1/history',
        expect.objectContaining({ signal })
      );
    });

    it('returns the response from http.get', async () => {
      const { api, http } = buildApi();
      const fakeResponse = { items: [{ id: 'evt-1' }], total: 1 };
      http.get.mockResolvedValueOnce(fakeResponse);

      await expect(api.listRuleChanges({ id: 'rule-1' })).resolves.toEqual(fakeResponse);
    });

    it('propagates errors from http.get', async () => {
      const { api, http } = buildApi();
      http.get.mockRejectedValueOnce(new Error('boom'));

      await expect(api.listRuleChanges({ id: 'rule-1' })).rejects.toThrow('boom');
    });
  });

  describe('getRuleChangeEvent', () => {
    it('GETs the encoded detail endpoint with rule id and event id', async () => {
      const { api, http } = buildApi();

      await api.getRuleChangeEvent({ id: 'rule-1', eventId: 'evt-1' });

      expect(http.get).toHaveBeenCalledWith('/api/alerting/v2/rules/rule-1/history/evt-1', {
        signal: undefined,
      });
    });

    it('encodes both path parameters', async () => {
      const { api, http } = buildApi();

      await api.getRuleChangeEvent({ id: 'a/b', eventId: 'c/d' });

      expect(http.get).toHaveBeenCalledWith('/api/alerting/v2/rules/a%2Fb/history/c%2Fd', {
        signal: undefined,
      });
    });

    it('forwards the abort signal', async () => {
      const { api, http } = buildApi();
      const signal = new AbortController().signal;

      await api.getRuleChangeEvent({ id: 'rule-1', eventId: 'evt-1', signal });

      expect(http.get).toHaveBeenCalledWith(
        '/api/alerting/v2/rules/rule-1/history/evt-1',
        expect.objectContaining({ signal })
      );
    });

    it('returns the detail response from http.get', async () => {
      const { api, http } = buildApi();
      const detail = { id: 'evt-1', snapshot: { name: 'rule' } };
      http.get.mockResolvedValueOnce(detail);

      await expect(api.getRuleChangeEvent({ id: 'rule-1', eventId: 'evt-1' })).resolves.toEqual(
        detail
      );
    });

    it('propagates errors from http.get', async () => {
      const { api, http } = buildApi();
      http.get.mockRejectedValueOnce(new Error('nope'));

      await expect(api.getRuleChangeEvent({ id: 'rule-1', eventId: 'evt-1' })).rejects.toThrow(
        'nope'
      );
    });
  });
});
