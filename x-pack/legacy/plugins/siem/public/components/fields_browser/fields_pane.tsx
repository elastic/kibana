/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { BrowserFields } from '../../containers/source';
import { ColumnHeader } from '../timeline/body/column_headers/column_header';

import { Category } from './category';
import { FieldBrowserProps } from './types';
import { getFieldItems } from './field_items';
import { FIELDS_PANE_WIDTH, TABLE_HEIGHT } from './helpers';

import * as i18n from './translations';

const NoFieldsPanel = styled.div`
  background-color: ${props => props.theme.eui.euiColorLightestShade};
  width: ${FIELDS_PANE_WIDTH}px;
  height: ${TABLE_HEIGHT}px;
`;

NoFieldsPanel.displayName = 'NoFieldsPanel';

const NoFieldsFlexGroup = styled(EuiFlexGroup)`
  height: 100%;
`;

NoFieldsFlexGroup.displayName = 'NoFieldsFlexGroup';

type Props = Pick<FieldBrowserProps, 'onFieldSelected' | 'onUpdateColumns' | 'timelineId'> & {
  columnHeaders: ColumnHeader[];
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
  /** The text displayed in the search input */
  searchInput: string;
  /**
   * The category selected on the left-hand side of the field browser
   */
  selectedCategoryId: string;
  /** The width field browser */
  width: number;
  /**
   * Invoked to add or remove a column from the timeline
   */
  toggleColumn: (column: ColumnHeader) => void;
};
export const FieldsPane = React.memo<Props>(
  ({
    columnHeaders,
    filteredBrowserFields,
    onCategorySelected,
    onUpdateColumns,
    searchInput,
    selectedCategoryId,
    timelineId,
    toggleColumn,
    width,
  }) => (
    <>
      {Object.keys(filteredBrowserFields).length > 0 ? (
        <Category
          categoryId={selectedCategoryId}
          data-test-subj="category"
          fieldItems={getFieldItems({
            browserFields: filteredBrowserFields,
            category: filteredBrowserFields[selectedCategoryId],
            categoryId: selectedCategoryId,
            columnHeaders,
            highlight: searchInput,
            onUpdateColumns,
            timelineId,
            toggleColumn,
          })}
          filteredBrowserFields={filteredBrowserFields}
          timelineId={timelineId}
          width={width}
          onCategorySelected={onCategorySelected}
        />
      ) : (
        <NoFieldsPanel>
          <NoFieldsFlexGroup alignItems="center" gutterSize="none" justifyContent="center">
            <EuiFlexItem grow={false}>
              <h3 data-test-subj="no-fields-match">{i18n.NO_FIELDS_MATCH_INPUT(searchInput)}</h3>
            </EuiFlexItem>
          </NoFieldsFlexGroup>
        </NoFieldsPanel>
      )}
    </>
  )
);

FieldsPane.displayName = 'FieldsPane';
