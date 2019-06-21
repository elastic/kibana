/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiInMemoryTable, EuiTitle } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { BrowserFields } from '../../containers/source';

import { FieldBrowserProps } from './types';
import { getCategoryColumns } from './category_columns';
import { TABLE_HEIGHT } from './helpers';

import * as i18n from './translations';

const CategoryNames = styled.div<{ height: number; width: number }>`
  ${({ height }) => `height: ${height}px`};
  overflow: auto;
  padding: 5px;
  ${({ width }) => `width: ${width}px`};
  thead {
    display: none;
  }
`;

const Title = styled(EuiTitle)`
  padding-left: 5px;
`;

type Props = Pick<
  FieldBrowserProps,
  'browserFields' | 'isLoading' | 'timelineId' | 'onUpdateColumns'
> & {
  /**
   * A map of categoryId -> metadata about the fields in that category,
   * filtered such that the name of every field in the category includes
   * the filter input (as a substring).
   */
  filteredBrowserFields: BrowserFields;
  /**
   * Invoked when the user clicks on the name of a category in the left-hand
   * side of the field browser
   */
  onCategorySelected: (categoryId: string) => void;
  /** The category selected on the left-hand side of the field browser */
  selectedCategoryId: string;
  /** The width of the categories pane */
  width: number;
};
export const CategoriesPane = pure<Props>(
  ({
    browserFields,
    filteredBrowserFields,
    isLoading,
    onCategorySelected,
    onUpdateColumns,
    selectedCategoryId,
    timelineId,
    width,
  }) => (
    <>
      <Title size="xxs">
        <h5>{i18n.CATEGORIES}</h5>
      </Title>

      <CategoryNames data-test-subj="categories-container" height={TABLE_HEIGHT} width={width}>
        <EuiInMemoryTable
          columns={getCategoryColumns({
            browserFields,
            filteredBrowserFields,
            isLoading,
            onCategorySelected,
            onUpdateColumns,
            selectedCategoryId,
            timelineId,
          })}
          items={Object.keys(filteredBrowserFields)
            .sort()
            .map(categoryId => ({ categoryId }))}
          message={i18n.NO_FIELDS_MATCH}
          pagination={false}
          sorting={false}
        />
      </CategoryNames>
    </>
  )
);
