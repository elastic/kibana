/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { extractPropertiesFromBucket } from './es_agg_utils';

describe('extractPropertiesFromBucket', () => {
  test('Should ignore specified keys', () => {
    const properties = extractPropertiesFromBucket({ key: '4/4/6' }, ['key']);
    expect(properties).toEqual({});
  });

  test('Should extract metric aggregation values', () => {
    const properties = extractPropertiesFromBucket({ avg_of_bytes: { value: 5359 } });
    expect(properties).toEqual({
      avg_of_bytes: 5359,
    });
  });

  test('Should extract bucket aggregation values', () => {
    const properties = extractPropertiesFromBucket({
      'terms_of_machine.os.keyword': {
        buckets: [
          {
            key: 'win xp',
            doc_count: 16,
          },
        ],
      },
    });
    expect(properties).toEqual({
      'terms_of_machine.os.keyword': 'win xp',
    });
  });
});
