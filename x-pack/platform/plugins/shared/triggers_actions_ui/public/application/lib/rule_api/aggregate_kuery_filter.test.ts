/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { loadRuleAggregationsWithKueryFilter } from './aggregate_kuery_filter';

const http = httpServiceMock.createStartContract();

describe('loadRuleAggregationsWithKueryFilter', () => {
  beforeEach(() => jest.resetAllMocks());

  test('should call aggregate API with base parameters', async () => {
    const resolvedValue = {
      rule_execution_status: {
        ok: 4,
        active: 2,
        error: 1,
        pending: 1,
        unknown: 0,
      },
    };
    http.post.mockResolvedValueOnce(resolvedValue);

    const result = await loadRuleAggregationsWithKueryFilter({ http });
    expect(result).toEqual({
      ruleExecutionStatus: {
        ok: 4,
        active: 2,
        error: 1,
        pending: 1,
        unknown: 0,
      },
    });
    expect(http.post.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_aggregate",
        Object {
          "body": "{\\"default_search_operator\\":\\"AND\\"}",
        },
      ]
    `);
  });

  test('should call aggregate API with ruleTypeIds', async () => {
    const resolvedValue = {
      rule_execution_status: {
        ok: 4,
        active: 2,
        error: 1,
        pending: 1,
        unknown: 0,
      },
    };

    http.post.mockResolvedValueOnce(resolvedValue);

    const result = await loadRuleAggregationsWithKueryFilter({ http, ruleTypeIds: ['foo'] });
    expect(result).toEqual({
      ruleExecutionStatus: {
        ok: 4,
        active: 2,
        error: 1,
        pending: 1,
        unknown: 0,
      },
    });

    expect(http.post.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_aggregate",
        Object {
          "body": "{\\"rule_type_ids\\":[\\"foo\\"],\\"default_search_operator\\":\\"AND\\"}",
        },
      ]
    `);
  });

  test('should call aggregate API with consumers', async () => {
    const resolvedValue = {
      rule_execution_status: {
        ok: 4,
        active: 2,
        error: 1,
        pending: 1,
        unknown: 0,
      },
    };

    http.post.mockResolvedValueOnce(resolvedValue);

    const result = await loadRuleAggregationsWithKueryFilter({ http, consumers: ['foo'] });
    expect(result).toEqual({
      ruleExecutionStatus: {
        ok: 4,
        active: 2,
        error: 1,
        pending: 1,
        unknown: 0,
      },
    });

    expect(http.post.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_aggregate",
        Object {
          "body": "{\\"default_search_operator\\":\\"AND\\",\\"consumers\\":[\\"foo\\"]}",
        },
      ]
    `);
  });
});
