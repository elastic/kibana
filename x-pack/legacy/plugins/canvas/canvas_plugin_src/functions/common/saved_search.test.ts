/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
jest.mock('ui/new_platform');
import { savedSearch } from './saved_search';
import { buildEmbeddableFilters } from '../../../public/lib/build_embeddable_filters';
import { ExpressionValueFilter } from '../../../types';

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

describe('savedSearch', () => {
  const fn = savedSearch().fn;
  const args = {
    id: 'some-id',
  };

  it('accepts null context', () => {
    const expression = fn(null, args, {} as any);

    expect(expression.input.filters).toEqual([]);
    expect(expression.input.timeRange).toBeUndefined();
  });

  it('accepts filter context', () => {
    const expression = fn(filterContext, args, {} as any);
    const embeddableFilters = buildEmbeddableFilters(filterContext.and);

    expect(expression.input.filters).toEqual(embeddableFilters.filters);
    expect(expression.input.timeRange).toEqual(embeddableFilters.timeRange);
  });
});
