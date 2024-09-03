/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIndexResultBadgeColor } from './get_index_result_badge_color';

describe('getIndexResultBadgeColor', () => {
  test('it returns `ghost` when `incompatible` is undefined', () => {
    expect(getIndexResultBadgeColor(undefined)).toEqual('ghost');
  });

  test('it returns `success` when `incompatible` is zero', () => {
    expect(getIndexResultBadgeColor(0)).toEqual('#6dcbb1');
  });

  test('it returns `danger` when `incompatible` is NOT zero', () => {
    expect(getIndexResultBadgeColor(1)).toEqual('danger');
  });
});
