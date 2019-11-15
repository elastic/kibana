/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiInMemoryTable } from '@elastic/eui';
import * as React from 'react';
import styled from 'styled-components';

import { BrowserFields } from '../../containers/source';

import { CategoryTitle } from './category_title';
import { FieldItem, getFieldColumns } from './field_items';
import { TABLE_HEIGHT } from './helpers';

const TableContainer = styled.div<{ height: number; width: number }>`
  ${({ height }) => `height: ${height}px`};
  overflow-x: hidden;
  overflow-y: auto;
  ${({ width }) => `width: ${width}px`};
`;

TableContainer.displayName = 'TableContainer';

interface Props {
  categoryId: string;
  fieldItems: FieldItem[];
  filteredBrowserFields: BrowserFields;
  onCategorySelected: (categoryId: string) => void;
  timelineId: string;
  width: number;
}

export const Category = React.memo<Props>(
  ({ categoryId, filteredBrowserFields, fieldItems, timelineId, width }) => (
    <>
      <CategoryTitle
        categoryId={categoryId}
        filteredBrowserFields={filteredBrowserFields}
        timelineId={timelineId}
      />

      <TableContainer
        className="euiTable--compressed"
        data-test-subj="category-table-container"
        height={TABLE_HEIGHT}
        width={width}
      >
        <EuiInMemoryTable
          items={fieldItems}
          columns={getFieldColumns()}
          pagination={false}
          sorting={true}
        />
      </TableContainer>
    </>
  )
);

Category.displayName = 'Category';
