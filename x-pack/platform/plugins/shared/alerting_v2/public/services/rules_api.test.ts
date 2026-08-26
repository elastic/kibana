/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { RulesApi } from './rules_api';
import { ALERTING_V2_RULE_API_PATH } from '../constants';

describe('RulesApi', () => {
  const http = httpServiceMock.createStartContract();
  const api = new (class extends RulesApi {
    constructor() {
      super(http as any);
    }
  })();

  beforeEach(() => jest.clearAllMocks());

  describe('upsertRule', () => {
    it('sends a PUT request with the rule id in the path', async () => {
      const payload = { kind: 'alert', metadata: { name: 'Test' } } as any;
      http.put.mockResolvedValue({ id: 'rule-1' });

      await api.upsertRule('rule-1', payload);

      expect(http.put).toHaveBeenCalledWith(`${ALERTING_V2_RULE_API_PATH}/rule-1`, {
        body: JSON.stringify(payload),
      });
    });
  });

  describe('createRule', () => {
    it('sends a POST request', async () => {
      const payload = { kind: 'alert', metadata: { name: 'Test' } } as any;
      http.post.mockResolvedValue({ id: 'rule-1' });

      await api.createRule(payload);

      expect(http.post).toHaveBeenCalledWith(ALERTING_V2_RULE_API_PATH, {
        body: JSON.stringify(payload),
      });
    });
  });

  describe('updateRule', () => {
    it('sends a PATCH request with the rule id in the path', async () => {
      const payload = { metadata: { name: 'Updated' } } as any;
      http.patch.mockResolvedValue({ id: 'rule-1' });

      await api.updateRule('rule-1', payload);

      expect(http.patch).toHaveBeenCalledWith(`${ALERTING_V2_RULE_API_PATH}/rule-1`, {
        body: JSON.stringify(payload),
      });
    });
  });

  describe('getRule', () => {
    it('sends a GET request', async () => {
      http.get.mockResolvedValue({ id: 'rule-1' });

      await api.getRule('rule-1');

      expect(http.get).toHaveBeenCalledWith(`${ALERTING_V2_RULE_API_PATH}/rule-1`, {
        signal: undefined,
      });
    });
  });

  describe('deleteRule', () => {
    it('sends a DELETE request', async () => {
      http.delete.mockResolvedValue({ id: 'rule-1' });

      await api.deleteRule('rule-1');

      expect(http.delete).toHaveBeenCalledWith(`${ALERTING_V2_RULE_API_PATH}/rule-1`);
    });
  });

  describe('enableRule', () => {
    it('sends a POST request to the _enable path with the rule id', async () => {
      http.post.mockResolvedValue({ id: 'rule-1', enabled: true });

      await api.enableRule('rule-1');

      expect(http.post).toHaveBeenCalledWith(`${ALERTING_V2_RULE_API_PATH}/rule-1/_enable`);
    });
  });

  describe('disableRule', () => {
    it('sends a POST request to the _disable path with the rule id', async () => {
      http.post.mockResolvedValue({ id: 'rule-1', enabled: false });

      await api.disableRule('rule-1');

      expect(http.post).toHaveBeenCalledWith(`${ALERTING_V2_RULE_API_PATH}/rule-1/_disable`);
    });
  });

  describe('runRule', () => {
    it('sends a POST request to the _run path with the rule id', async () => {
      http.post.mockResolvedValue(undefined);

      await api.runRule('rule-1');

      expect(http.post).toHaveBeenCalledWith(`${ALERTING_V2_RULE_API_PATH}/rule-1/_run`);
    });
  });

  describe('listTags', () => {
    it('GET /rules/tags with no params when called with defaults', async () => {
      http.get.mockResolvedValue({ tags: ['cpu', 'memory'] });

      const result = await api.listTags();

      expect(http.get).toHaveBeenCalledWith(`${ALERTING_V2_RULE_API_PATH}/tags`, {
        query: { search: undefined, kind: undefined },
      });
      expect(result).toEqual({ tags: ['cpu', 'memory'] });
    });

    it('forwards search param in the query', async () => {
      http.get.mockResolvedValue({ tags: ['production'] });

      await api.listTags({ search: 'pro' });

      expect(http.get).toHaveBeenCalledWith(`${ALERTING_V2_RULE_API_PATH}/tags`, {
        query: { search: 'pro', kind: undefined },
      });
    });

    it('forwards kind param in the query', async () => {
      http.get.mockResolvedValue({ tags: ['alert-tag'] });

      await api.listTags({ kind: 'alert' });

      expect(http.get).toHaveBeenCalledWith(`${ALERTING_V2_RULE_API_PATH}/tags`, {
        query: { search: undefined, kind: 'alert' },
      });
    });

    it('does not call the old _tags path', async () => {
      http.get.mockResolvedValue({ tags: [] });

      await api.listTags();

      expect(http.get).not.toHaveBeenCalledWith(
        expect.stringContaining('_tags'),
        expect.anything()
      );
    });
  });
});
