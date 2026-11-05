/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ruleHealthAggregationFactory } from './v1';
import { validateRuleAggregationFields } from '../../validation';

describe('ruleHealthAggregationFactory', () => {
  it('builds the expected aggregations with defaults', () => {
    expect(ruleHealthAggregationFactory()).toMatchInlineSnapshot(`
      Object {
        "api_key_error": Object {
          "aggs": Object {
            "reason": Object {
              "terms": Object {
                "field": "alert.attributes.executionStatus.error.reason",
              },
            },
          },
          "terms": Object {
            "field": "alert.attributes.executionStatus.error.message",
            "include": ".*(0x28D520|0xD38358|0x7E0116|0xE436AE|api key has been invalidated|api key is expired|failed to authenticate cloud API key|unable to authenticate with provided credentials|missing authentication credentials).*",
            "size": 100,
          },
        },
        "error_reason": Object {
          "aggs": Object {
            "message": Object {
              "terms": Object {
                "field": "alert.attributes.executionStatus.error.message",
                "size": 5,
              },
            },
          },
          "terms": Object {
            "field": "alert.attributes.executionStatus.error.reason",
            "size": 20,
          },
        },
        "legacy_missing_api_key": Object {
          "filter": Object {
            "term": Object {
              "alert.attributes.tags": "Missing Universal Api Key",
            },
          },
        },
        "missing_api_key": Object {
          "filter": Object {
            "term": Object {
              "alert.attributes.tags": "Missing Elastic Cloud API Key",
            },
          },
        },
        "outcome": Object {
          "terms": Object {
            "field": "alert.attributes.lastRun.outcome",
          },
        },
        "status": Object {
          "terms": Object {
            "field": "alert.attributes.executionStatus.status",
          },
        },
        "warning_reason": Object {
          "terms": Object {
            "field": "alert.attributes.executionStatus.warning.reason",
            "size": 20,
          },
        },
      }
    `);
  });

  it('honours custom sizes', () => {
    const aggs = ruleHealthAggregationFactory({ maxReasons: 3, maxMessagesPerReason: 1 });
    expect(aggs.error_reason.terms).toEqual(expect.objectContaining({ size: 3 }));
    expect(aggs.error_reason.aggs?.message.terms).toEqual(expect.objectContaining({ size: 1 }));
    expect(aggs.warning_reason.terms).toEqual(expect.objectContaining({ size: 3 }));
  });

  it('passes the rule aggregation field validation', () => {
    expect(() => validateRuleAggregationFields(ruleHealthAggregationFactory())).not.toThrow();
  });
});
