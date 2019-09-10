/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getDiscoverHref } from './navigation';

describe('navigation', () => {
  test('getDiscoverHref should provide encoded href', () => {
    expect(getDiscoverHref('farequote-airline', 'http://showcase.ml-qa.com:5601/app/ml')).toBe(
      "http://showcase.ml-qa.com:5601/app/ml#/discover?_g=()&_a=(index:'farequote-airline')"
    );
  });
});
