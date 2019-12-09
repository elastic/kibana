/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  mockKpiHostsOptions,
  mockKpiHostsUniqueIpsQuery,
  mockKpiHostDetailsOptions,
  mockKpiHostDetailsUniqueIpsQuery,
} from './mock';
import { buildUniqueIpsQuery } from './query_unique_ips.dsl';

const table: Array<[typeof mockKpiHostDetailsOptions, typeof mockKpiHostDetailsUniqueIpsQuery]> = [
  [mockKpiHostsOptions, mockKpiHostsUniqueIpsQuery],
  [mockKpiHostDetailsOptions, mockKpiHostDetailsUniqueIpsQuery],
];

describe.each(table)('buildUniqueIpsQuery', (option, expected) => {
  test(`returns correct query by option type`, () => {
    expect(buildUniqueIpsQuery(option)).toMatchObject(expected);
  });
});
