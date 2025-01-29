/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseActionRunOutcomeByConnectorTypesBucket } from './parse_connector_type_bucket';

describe('parseActionRunOutcomeByConnectorTypesBucket', () => {
  test('should correctly parse connector type bucket results', () => {
    expect(
      parseActionRunOutcomeByConnectorTypesBucket([
        {
          key: '.server-log',
          doc_count: 78,
          outcome: {
            count: {
              buckets: [
                { key: 'success', doc_count: 2 },
                { key: 'failure', doc_count: 1 },
              ],
            },
          },
        },
        {
          key: '.index',
          doc_count: 42,
          outcome: {
            count: {
              buckets: [
                { key: 'success', doc_count: 3 },
                { key: 'failure', doc_count: 4 },
              ],
            },
          },
        },
      ])
    ).toEqual({
      __index: {
        failure: 4,
        success: 3,
      },
      '__server-log': {
        failure: 1,
        success: 2,
      },
    });
  });

  test('should handle missing values', () => {
    expect(
      parseActionRunOutcomeByConnectorTypesBucket([
        {
          key: '.server-log',
          doc_count: 78,
          outcome: {
            count: {
              // @ts-expect-error
              buckets: [{ key: 'success', doc_count: 2 }, { key: 'failure' }],
            },
          },
        },
        {
          key: '.index',
          outcome: {
            // @ts-expect-error
            count: {},
          },
        },
      ])
    ).toEqual({
      '__server-log': {
        failure: 0,
        success: 2,
      },
      __index: {},
    });
  });

  test('should handle empty input', () => {
    expect(parseActionRunOutcomeByConnectorTypesBucket([])).toEqual({});
  });
  //
  test('should handle undefined input', () => {
    expect(parseActionRunOutcomeByConnectorTypesBucket(undefined)).toEqual({});
  });
});
