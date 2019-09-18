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
  it('should ignore empty fields, but not falsy ones', () => {
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
        {
          name: 'geo.src',
          type: 'string',
        },
      ]
    );

    expect(results).toEqual({
      bytes: {
        cardinality: 1,
        count: 1,
      },
    });
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

  // TODO: Alias information is not persisted in the index pattern, so we don't have access
  it('fails to map alias fields', () => {
    const results = recursiveFlatten(realHits, stubbedLogstashFields(), [
      {
        name: '@timestamp',
        type: 'date',
      },
    ]);

    expect(results).toEqual({});
  });

  // TODO: Scripts are not currently run in the _search query
  it('should fail to map scripted fields', () => {
    const scriptedField = {
      name: 'hour_of_day',
      type: 'number',
      count: 0,
      scripted: true,
      script: "doc['timestamp'].value.hourOfDay",
      lang: 'painless',
      searchable: true,
      aggregatable: true,
      readFromDocValues: false,
    };

    const results = recursiveFlatten(
      realHits,
      [...stubbedLogstashFields(), scriptedField],
      [
        {
          name: 'hour_of_day',
          type: 'number',
        },
      ]
    );

    expect(results).toEqual({});
  });
});
