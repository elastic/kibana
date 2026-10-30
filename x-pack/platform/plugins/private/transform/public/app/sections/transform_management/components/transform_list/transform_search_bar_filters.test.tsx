/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Clause } from '@elastic/eui/src/components/search_bar/query/ast';

import type { TransformListRow } from '../../../../common';
import transformListRow from '../../../../common/__mocks__/transform_list_row.json';

import {
  filterTransforms,
  getTransformType,
  transformFilters,
} from './transform_search_bar_filters';

const createFieldClause = (field: string, value: string): Clause =>
  ({ type: 'field', field, value, match: 'must' } as Clause);

describe('transform search bar filters', () => {
  const batchTransform = transformListRow as unknown as TransformListRow;
  const continuousTransform = {
    ...batchTransform,
    id: 'latest-continuous',
    mode: 'continuous',
    config: {
      ...batchTransform.config,
      id: 'latest-continuous',
      pivot: undefined,
      latest: {
        unique_key: ['customer_id'],
        sort: '@timestamp',
      },
    },
  } as unknown as TransformListRow;

  test('uses the redesigned filter order', () => {
    expect(transformFilters[0]).toEqual(expect.objectContaining({ name: 'Health' }));
    expect(transformFilters[1]).toEqual(expect.objectContaining({ type: 'custom_component' }));
    expect(transformFilters[2]).toEqual(expect.objectContaining({ name: 'Status' }));
    expect(transformFilters[3]).toEqual(expect.objectContaining({ name: 'Execution' }));

    const executionFilter = transformFilters[3];
    expect(executionFilter.type).toBe('field_value_selection');
    if (executionFilter.type !== 'field_value_selection') {
      throw new Error('Expected execution to use a field value selection filter');
    }
    expect(executionFilter.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: 'batch', name: 'One-time' }),
        expect.objectContaining({ value: 'continuous', name: 'Continuous' }),
      ])
    );

    const statusFilter = transformFilters[2];
    if (statusFilter.type !== 'field_value_selection' || !Array.isArray(statusFilter.options)) {
      throw new Error('Expected status to use static field value selection options');
    }
    expect(statusFilter.options.every((option) => option.view === undefined)).toBe(true);
  });

  test('filters execution even when transform stats are unavailable', () => {
    const batchWithoutStats = { ...batchTransform, stats: undefined };

    expect(
      filterTransforms(
        [batchWithoutStats, continuousTransform],
        [createFieldClause('mode', 'batch')]
      )
    ).toEqual([batchWithoutStats]);
  });

  test('filters by transform type', () => {
    expect(getTransformType(batchTransform)).toBe('pivot');
    expect(getTransformType(continuousTransform)).toBe('latest');

    expect(
      filterTransforms([batchTransform, continuousTransform], [createFieldClause('type', 'latest')])
    ).toEqual([continuousTransform]);
  });
});
