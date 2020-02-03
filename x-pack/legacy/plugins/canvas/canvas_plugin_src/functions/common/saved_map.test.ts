/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
jest.mock('ui/new_platform');
import { savedMap } from './saved_map';
import { getQueryFilters } from '../../../server/lib/build_embeddable_filters';

const filterContext = {
  and: [
    { and: [], value: 'filter-value', column: 'filter-column', type: 'exactly' },
    {
      and: [],
      column: 'time-column',
      type: 'time',
      from: '2019-06-04T04:00:00.000Z',
      to: '2019-06-05T04:00:00.000Z',
    },
  ],
};

describe('savedMap', () => {
  const fn = savedMap().fn;
  const args = {
    id: 'some-id',
    center: null,
    title: null,
    timerange: null,
    hideLayer: [],
  };

  it('accepts null context', () => {
    const expression = fn(null, args, {});

    expect(expression.input.filters).toEqual([]);
  });

  it('accepts filter context', () => {
    const expression = fn(filterContext, args, {});
    const embeddableFilters = getQueryFilters(filterContext.and);

    expect(expression.input.filters).toEqual(embeddableFilters);
  });
});
