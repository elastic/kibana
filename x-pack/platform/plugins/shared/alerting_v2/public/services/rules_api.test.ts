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
});
