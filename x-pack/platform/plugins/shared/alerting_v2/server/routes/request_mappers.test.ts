/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  toCountNewEventsSinceArgs,
  toFindActionPoliciesArgs,
  toFindRulesArgs,
  toGetRuleExecutionsArgs,
  toListExecutionHistoryArgs,
} from './request_mappers';

describe('route request mappers', () => {
  describe('toFindRulesArgs', () => {
    it('maps the snake_case request to camelCase client args', () => {
      expect(
        toFindRulesArgs({
          page: 2,
          per_page: 50,
          filter: 'my-filter',
          search: 'error',
          sort_field: 'name',
          sort_order: 'desc',
        })
      ).toEqual({
        page: 2,
        perPage: 50,
        filter: 'my-filter',
        search: 'error',
        sortField: 'name',
        sortOrder: 'desc',
      });
    });
  });

  describe('toFindActionPoliciesArgs', () => {
    it('maps the snake_case request to camelCase client args', () => {
      expect(
        toFindActionPoliciesArgs({
          page: 3,
          per_page: 10,
          search: 'slack',
          tags: ['a', 'b'],
          enabled: true,
          sort_field: 'name',
          sort_order: 'asc',
        })
      ).toEqual({
        page: 3,
        perPage: 10,
        search: 'slack',
        tags: ['a', 'b'],
        enabled: true,
        sortField: 'name',
        sortOrder: 'asc',
      });
    });
  });

  describe('toListExecutionHistoryArgs', () => {
    it('maps the snake_case request to camelCase client args (without request)', () => {
      expect(
        toListExecutionHistoryArgs({
          page: 1,
          per_page: 100,
          search: 'foo',
          rule_ids: ['rule-1', 'rule-2'],
          outcome: 'dispatched',
        })
      ).toEqual({
        page: 1,
        perPage: 100,
        search: 'foo',
        ruleIds: ['rule-1', 'rule-2'],
        outcome: 'dispatched',
      });
    });
  });

  describe('toCountNewEventsSinceArgs', () => {
    it('maps the snake_case request to camelCase client args (keeps since, no request)', () => {
      expect(
        toCountNewEventsSinceArgs({
          since: '2026-01-01T00:00:00.000Z',
          search: 'bar',
          rule_ids: ['rule-1'],
          outcome: 'throttled',
        })
      ).toEqual({
        since: '2026-01-01T00:00:00.000Z',
        search: 'bar',
        ruleIds: ['rule-1'],
        outcome: 'throttled',
      });
    });
  });

  describe('toGetRuleExecutionsArgs', () => {
    it('maps the snake_case request to camelCase client args and translates the sort value', () => {
      expect(
        toGetRuleExecutionsArgs({
          rule_id: ['rule-1'],
          outcome: ['success'],
          from: '2026-01-01T00:00:00.000Z',
          to: '2026-01-02T00:00:00.000Z',
          sort: 'started_at',
          sort_order: 'asc',
          page: 2,
          per_page: 25,
        })
      ).toEqual({
        ruleIds: ['rule-1'],
        outcomes: ['success'],
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-01-02T00:00:00.000Z',
        sort: 'startedAt',
        sortOrder: 'asc',
        page: 2,
        perPage: 25,
      });
    });
  });
});
