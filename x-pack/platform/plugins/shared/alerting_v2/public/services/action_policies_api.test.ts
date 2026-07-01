/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { ActionPoliciesApi } from './action_policies_api';
import { ALERTING_V2_ACTION_POLICY_API_PATH } from '../constants';

describe('ActionPoliciesApi', () => {
  const http = httpServiceMock.createStartContract();
  const api = new (class extends ActionPoliciesApi {
    constructor() {
      super(http as any);
    }
  })();

  beforeEach(() => jest.clearAllMocks());

  describe('upsertActionPolicy', () => {
    it('sends a PUT request with the policy id in the path', async () => {
      const payload = { name: 'Test', description: '', destinations: [] } as any;
      http.put.mockResolvedValue({ id: 'policy-1' });

      await api.upsertActionPolicy('policy-1', payload);

      expect(http.put).toHaveBeenCalledWith(`${ALERTING_V2_ACTION_POLICY_API_PATH}/policy-1`, {
        body: JSON.stringify(payload),
      });
    });
  });

  describe('createActionPolicy', () => {
    it('sends a POST request', async () => {
      const payload = { name: 'Test', description: '', destinations: [] } as any;
      http.post.mockResolvedValue({ id: 'policy-1' });

      await api.createActionPolicy(payload);

      expect(http.post).toHaveBeenCalledWith(ALERTING_V2_ACTION_POLICY_API_PATH, {
        body: JSON.stringify(payload),
      });
    });
  });

  describe('updateActionPolicy', () => {
    it('sends a PATCH request with the policy id in the path', async () => {
      const payload = { name: 'Updated' } as any;
      http.patch.mockResolvedValue({ id: 'policy-1' });

      await api.updateActionPolicy('policy-1', payload);

      expect(http.patch).toHaveBeenCalledWith(`${ALERTING_V2_ACTION_POLICY_API_PATH}/policy-1`, {
        body: JSON.stringify(payload),
      });
    });
  });

  describe('getActionPolicy', () => {
    it('sends a GET request', async () => {
      http.get.mockResolvedValue({ id: 'policy-1' });

      await api.getActionPolicy('policy-1');

      expect(http.get).toHaveBeenCalledWith(`${ALERTING_V2_ACTION_POLICY_API_PATH}/policy-1`);
    });
  });

  describe('deleteActionPolicy', () => {
    it('sends a DELETE request', async () => {
      http.delete.mockResolvedValue(undefined);

      await api.deleteActionPolicy('policy-1');

      expect(http.delete).toHaveBeenCalledWith(`${ALERTING_V2_ACTION_POLICY_API_PATH}/policy-1`);
    });
  });

  describe('matchActionPoliciesForRule', () => {
    it('sends a POST request', async () => {
      http.post.mockResolvedValue({ items: [] });

      await api.matchActionPoliciesForRule('rule-1');

      expect(http.post).toHaveBeenCalledWith(
        `${ALERTING_V2_ACTION_POLICY_API_PATH}/_match_for_rule`,
        { body: JSON.stringify({ rule: { id: 'rule-1' } }) }
      );
    });
  });

  describe('fetchDataFields', () => {
    it('omits the query param entirely when no matcher is provided', async () => {
      http.get.mockResolvedValue([]);

      await api.fetchDataFields();

      expect(http.get).toHaveBeenCalledWith(
        `${ALERTING_V2_ACTION_POLICY_API_PATH}/suggestions/data_fields`,
        {}
      );
    });

    it('forwards the trimmed matcher as a query parameter', async () => {
      http.get.mockResolvedValue([]);

      await api.fetchDataFields('  rule.id : "abc"  ');

      expect(http.get).toHaveBeenCalledWith(
        `${ALERTING_V2_ACTION_POLICY_API_PATH}/suggestions/data_fields`,
        {
          query: { matcher: 'rule.id : "abc"' },
        }
      );
    });

    it('omits the query param when matcher is empty or whitespace', async () => {
      http.get.mockResolvedValue([]);

      await api.fetchDataFields('   ');

      expect(http.get).toHaveBeenCalledWith(
        `${ALERTING_V2_ACTION_POLICY_API_PATH}/suggestions/data_fields`,
        {}
      );
    });

    it('returns the response payload from the HTTP layer', async () => {
      http.get.mockResolvedValue(['data.host.name', 'data.count']);

      const result = await api.fetchDataFields();

      expect(result).toEqual(['data.host.name', 'data.count']);
    });
  });
});
