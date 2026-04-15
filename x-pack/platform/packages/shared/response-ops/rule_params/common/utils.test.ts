/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateKQLStringFilter } from './utils';

describe('validateKQLStringFilter', () => {
  const data = [
    // input, output
    ['', undefined],
    ['host.name:host-0', undefined],
  ];
  const dataWithError = [
    // input, output
    [
      ':*',
      'filterQuery must be a valid KQL filter (error: Expected "(", NOT, end of input, field name, value, whitespace but ":" found.',
    ],
  ];

  test.each(data)('validateKQLStringFilter(%s): %o', (input: any, output: any) => {
    expect(validateKQLStringFilter(input)).toEqual(output);
  });

  test.each(dataWithError)('validateKQLStringFilter(%s): %o', (input: any, output: any) => {
    expect(validateKQLStringFilter(input)).toContain(output);
  });
});
