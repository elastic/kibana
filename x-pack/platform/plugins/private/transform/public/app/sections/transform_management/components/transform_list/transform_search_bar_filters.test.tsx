/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Clause } from '@elastic/eui/src/components/search_bar/query/ast';

import type { TransformListRow } from '../../../../common';
import transformListRow from '../../../../common/__mocks__/transform_list_row.json';

import { filterTransforms, transformFilters } from './transform_search_bar_filters';

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
    expect(transformFilters.map(({ name }) => name)).toEqual([
      'Health',
      'Type',
      'Status',
      'Execution',
    ]);
    expect(transformFilters[3].options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: 'batch', name: 'One-time' }),
        expect.objectContaining({ value: 'continuous', name: 'Continuous' }),
      ])
    );
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
    expect(
      filterTransforms(
        [batchTransform, continuousTransform],
        [createFieldClause('type', 'latest')]
      )
    ).toEqual([continuousTransform]);
  });
});
