/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
jest.mock('ui/new_platform');
import { savedVisualization } from './saved_visualization';
import { buildEmbeddableFilters } from '../../../server/lib/build_embeddable_filters';

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

describe('savedVisualization', () => {
  const fn = savedVisualization().fn;
  const args = {
    id: 'some-id',
  };

  it('accepts null context', () => {
    const expression = fn(null, args, {});

    expect(expression.input.filters).toEqual([]);
    expect(expression.input.timeRange).toBeUndefined();
  });

  it('accepts filter context', () => {
    const expression = fn(filterContext, args, {});
    const embeddableFilters = buildEmbeddableFilters(filterContext.and);

    expect(expression.input.filters).toEqual(embeddableFilters.filters);
    expect(expression.input.timeRange).toEqual(embeddableFilters.timeRange);
  });
});
