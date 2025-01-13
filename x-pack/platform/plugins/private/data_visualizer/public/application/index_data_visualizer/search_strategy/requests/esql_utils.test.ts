/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getESQLPercentileQueryArray } from './esql_utils';

describe('getESQLPercentileQueryArray', () => {
  test('should return correct ESQL query', () => {
    const query = getESQLPercentileQueryArray('@odd_field', [0, 50, 100]);
    expect(query).toEqual([
      '`@odd_field_p0` = PERCENTILE(`@odd_field`, 0)',
      '`@odd_field_p50` = PERCENTILE(`@odd_field`, 50)',
      '`@odd_field_p100` = PERCENTILE(`@odd_field`, 100)',
    ]);
  });
});
