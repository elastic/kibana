/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTableFieldDataColumnType } from '@elastic/eui';

import type { TransformListRow } from '../../../../common';
import transformListRow from '../../../../common/__mocks__/transform_list_row.json';

import { getCurrentPageTransforms } from './get_current_page_transforms';

describe('getCurrentPageTransforms', () => {
  test('matches the table field sorting and pagination', () => {
    const transforms = ['transform-c', 'transform-a', 'transform-b'].map(
      (id) =>
        ({
          ...transformListRow,
          id,
          config: { ...transformListRow.config, id },
        } as unknown as TransformListRow)
    );
    const columns: Array<EuiTableFieldDataColumnType<TransformListRow>> = [
      {
        field: 'id',
        name: 'ID',
        sortable: true,
      },
    ];

    expect(
      getCurrentPageTransforms({
        columns,
        transforms,
        pagination: {
          pageIndex: 1,
          pageSize: 1,
          totalItemCount: transforms.length,
        },
        sorting: { sort: { field: 'id', direction: 'asc' } },
      }).map(({ id }) => id)
    ).toEqual(['transform-b']);
  });
});
