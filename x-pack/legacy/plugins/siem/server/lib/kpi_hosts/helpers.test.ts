/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isKpiHostDetailsQuery } from './helpers';
import { mockKpiHostsOptions, mockKpiHostDetailsOptions } from './mock';

describe('helpers', () => {
  const table: Array<[typeof mockKpiHostDetailsOptions, boolean]> = [
    [mockKpiHostsOptions, false],
    [mockKpiHostDetailsOptions, true],
  ];

  describe.each(table)('isHostDetails', (option, expected) => {
    test(`it should tell if it is kpiHostDetails option`, () => {
      expect(isKpiHostDetailsQuery(option)).toBe(expected);
    });
  });
});
