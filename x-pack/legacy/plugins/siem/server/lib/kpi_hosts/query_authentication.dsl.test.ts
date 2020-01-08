/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  mockKpiHostsOptions,
  mockKpiHostsAuthQuery,
  mockKpiHostDetailsOptions,
  mockKpiHostDetailsAuthQuery,
} from './mock';
import { buildAuthQuery } from './query_authentication.dsl';

const table = [
  [mockKpiHostsOptions, mockKpiHostsAuthQuery] as [
    typeof mockKpiHostsOptions,
    typeof mockKpiHostsAuthQuery
  ],
  [mockKpiHostDetailsOptions, mockKpiHostDetailsAuthQuery] as [
    typeof mockKpiHostDetailsOptions,
    typeof mockKpiHostDetailsAuthQuery
  ],
];

describe.each(table)('buildAuthQuery', (option, expected) => {
  test(`returns correct query by option type`, () => {
    expect(buildAuthQuery(option)).toMatchObject(expected);
  });
});
