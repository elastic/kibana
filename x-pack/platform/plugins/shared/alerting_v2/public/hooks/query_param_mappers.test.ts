/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  toCountNewExecutionEventsRequest,
  toFindActionPoliciesRequest,
  toFindRulesRequest,
  toGetRuleExecutionsRequest,
  toListExecutionHistoryRequest,
} from './query_param_mappers';

describe('query param mappers', () => {
  describe('toFindRulesRequest', () => {
    it('maps camelCase view state to the snake_case request', () => {
      expect(
        toFindRulesRequest({
          page: 2,
          perPage: 50,
          filter: 'my-filter',
          search: 'error',
          sortField: 'name',
          sortOrder: 'desc',
        })
      ).toEqual({
        page: 2,
        per_page: 50,
        filter: 'my-filter',
        search: 'error',
        sort_field: 'name',
        sort_order: 'desc',
      });
    });
  });

  describe('toFindActionPoliciesRequest', () => {
    it('maps camelCase view state to the snake_case request', () => {
      expect(
        toFindActionPoliciesRequest({
          page: 3,
          perPage: 10,
          search: 'slack',
          tags: ['a', 'b'],
          enabled: true,
          sortField: 'name',
          sortOrder: 'asc',
        })
      ).toEqual({
        page: 3,
        per_page: 10,
        search: 'slack',
        tags: ['a', 'b'],
        enabled: true,
        sort_field: 'name',
        sort_order: 'asc',
      });
    });
  });

  describe('toListExecutionHistoryRequest', () => {
    it('maps camelCase view state to the snake_case request', () => {
      expect(
        toListExecutionHistoryRequest({
          page: 1,
          perPage: 100,
          search: 'foo',
          ruleIds: ['rule-1', 'rule-2'],
          outcome: 'dispatched',
        })
      ).toEqual({
        page: 1,
        per_page: 100,
        search: 'foo',
        rule_ids: ['rule-1', 'rule-2'],
        outcome: 'dispatched',
      });
    });
  });

  describe('toCountNewExecutionEventsRequest', () => {
    it('maps camelCase view state to the snake_case request (including since)', () => {
      expect(
        toCountNewExecutionEventsRequest({
          since: '2026-01-01T00:00:00.000Z',
          search: 'bar',
          ruleIds: ['rule-1'],
          outcome: 'throttled',
        })
      ).toEqual({
        since: '2026-01-01T00:00:00.000Z',
        search: 'bar',
        rule_ids: ['rule-1'],
        outcome: 'throttled',
      });
    });
  });

  describe('toGetRuleExecutionsRequest', () => {
    it('maps camelCase view state to the snake_case request and translates the sort value', () => {
      expect(
        toGetRuleExecutionsRequest({
          page: 2,
          perPage: 50,
          ruleIds: ['rule-1'],
          outcome: ['failure'],
          from: '2026-01-01T00:00:00.000Z',
          to: '2026-01-02T00:00:00.000Z',
          sort: 'startedAt',
          sortOrder: 'asc',
        })
      ).toEqual({
        page: 2,
        per_page: 50,
        rule_id: ['rule-1'],
        outcome: ['failure'],
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-01-02T00:00:00.000Z',
        sort: 'started_at',
        sort_order: 'asc',
      });
    });
  });
});
