/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import realHits from '../../../../../../src/fixtures/real_hits';
// @ts-ignore
import stubbedLogstashFields from '../../../../../../src/fixtures/logstash_fields';
import { recursiveFlatten } from './index_stats';

describe('Index Stats route', () => {
  it('should ignore falsy fields', () => {
    const results = recursiveFlatten(
      [{ _source: {} }, { _source: { bytes: false } }],
      stubbedLogstashFields(),
      [
        {
          name: 'extension.keyword',
          type: 'string',
        },
        {
          name: 'bytes',
          type: 'number',
        },
      ]
    );

    expect(results).toEqual({});
  });

  it('should find existing fields based on mapping', () => {
    const results = recursiveFlatten(realHits, stubbedLogstashFields(), [
      {
        name: 'extension.keyword',
        type: 'string',
      },
      {
        name: 'bytes',
        type: 'number',
      },
    ]);

    expect(results).toEqual({
      bytes: {
        count: 20,
        cardinality: 16,
      },
      'extension.keyword': {
        count: 20,
        cardinality: 4,
      },
    });
  });
});
