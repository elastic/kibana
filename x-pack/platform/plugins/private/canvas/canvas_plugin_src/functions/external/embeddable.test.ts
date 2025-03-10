/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { embeddableFunctionFactory } from './embeddable';
import { getQueryFilters } from '../../../common/lib/build_embeddable_filters';
import { ExpressionValueFilter } from '../../../types';
import { encode } from '../../../common/lib/embeddable_dataurl';

const filterContext: ExpressionValueFilter = {
  type: 'filter',
  and: [
    {
      type: 'filter',
      and: [],
      value: 'filter-value',
      column: 'filter-column',
      filterType: 'exactly',
    },
    {
      type: 'filter',
      and: [],
      column: 'time-column',
      filterType: 'time',
      from: '2019-06-04T04:00:00.000Z',
      to: '2019-06-05T04:00:00.000Z',
    },
  ],
};

const embeddablePersistableStateServiceMock = {
  extract: jest.fn(),
  inject: jest.fn(),
  getAllMigrations: jest.fn(),
};

describe('embeddable', () => {
  const fn = embeddableFunctionFactory({
    embeddablePersistableStateService: embeddablePersistableStateServiceMock,
  })().fn;
  const config = {
    id: 'some-id',
    timerange: { from: '15m', to: 'now' },
    title: 'test embeddable',
  };

  const args = {
    config: encode(config),
    type: 'visualization',
  };

  it('accepts null context', () => {
    const expression = fn(null, args, {} as any);

    expect(expression.input.filters).toEqual([]);
  });

  it('accepts filter context', () => {
    const expression = fn(filterContext, args, {} as any);
    const embeddableFilters = getQueryFilters(filterContext.and);

    expect(expression.input.filters).toEqual(embeddableFilters);
  });
});
