/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseSimpleRuleTypeBucket } from './parse_simple_rule_type_bucket';

describe('parseSimpleRuleTypeBucket', () => {
  test('should correctly parse rule type bucket results', () => {
    expect(
      parseSimpleRuleTypeBucket([
        {
          key: '.index-threshold',
          doc_count: 78,
        },
        {
          key: 'document.test.',
          doc_count: 42,
        },
        {
          key: 'logs.alert.document.count',
          doc_count: 28,
        },
      ])
    ).toEqual({
      '__index-threshold': 78,
      document__test__: 42,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      logs__alert__document__count: 28,
    });
  });

  test('should handle missing values', () => {
    expect(
      parseSimpleRuleTypeBucket([
        // @ts-expect-error
        {
          key: '.index-threshold',
        },
        {
          key: 'document.test.',
          doc_count: 42,
        },
        {
          key: 'logs.alert.document.count',
          doc_count: 28,
        },
      ])
    ).toEqual({
      '__index-threshold': 0,
      document__test__: 42,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      logs__alert__document__count: 28,
    });
  });

  test('should handle empty input', () => {
    expect(parseSimpleRuleTypeBucket([])).toEqual({});
  });

  test('should handle undefined input', () => {
    // @ts-expect-error
    expect(parseSimpleRuleTypeBucket(undefined)).toEqual({});
  });
});
