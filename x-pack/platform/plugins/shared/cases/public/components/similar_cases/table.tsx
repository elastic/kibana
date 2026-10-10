/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback } from 'react';
import { css } from '@emotion/react';
import type { EuiBasicTableProps, Pagination } from '@elastic/eui';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonText,
  EuiBasicTable,
  useEuiTheme,
} from '@elastic/eui';

import type { SimilarCaseUI } from '../../../common/ui/types';
import type { CasesColumnSelection } from '../all_cases/types';
import { useGetCaseConfiguration } from '../../containers/configure/use_get_case_configuration';
import { ColumnsPopover } from '../all_cases/components/columns_popover';
import { SidebarToggleButton } from '../case_view/components/sidebar/sidebar_toggle_button';

import * as i18n from './translations';
import { useSimilarCasesColumns } from './use_similar_cases_columns';

export interface SimilarCasesTableProps {
  cases: SimilarCaseUI[];
  isLoading: boolean;
  onChange: EuiBasicTableProps<SimilarCaseUI>['onChange'];
  pagination: Pagination;
  selectedColumns: CasesColumnSelection[];
  onSelectedColumnsChange: (columns: CasesColumnSelection[]) => void;
}

export const SimilarCasesTable: FunctionComponent<SimilarCasesTableProps> = ({
  cases,
  isLoading,
  onChange,
  pagination,
  selectedColumns,
  onSelectedColumnsChange,
}) => {
  const { euiTheme } = useEuiTheme();

  const {
    data: { customFields },
  } = useGetCaseConfiguration();

  const { columns } = useSimilarCasesColumns({ selectedColumns, customFields });

  const tableRowProps = useCallback(
    (theCase: SimilarCaseUI) => ({
      'data-test-subj': `similar-cases-table-row-${theCase.id}`,
    }),
    []
  );

  return (
    <>
      <EuiFlexGroup
        justifyContent="spaceBetween"
        gutterSize="s"
        alignItems="center"
        css={css`
          padding-top: ${euiTheme.size.s};
        `}
        data-test-subj="similar-cases-table-toolbar"
      >
        <EuiFlexItem grow={false}>
          <ColumnsPopover
            selectedColumns={selectedColumns}
            onSelectedColumnsChange={onSelectedColumnsChange}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <SidebarToggleButton />
        </EuiFlexItem>
      </EuiFlexGroup>
      {isLoading ? (
        <div
          css={css`
            margin-top: ${euiTheme.size.m};
          `}
        >
          <EuiSkeletonText data-test-subj="similar-cases-table-loading" lines={10} />
        </div>
      ) : (
        <EuiBasicTable
          tableCaption={i18n.TABLE_CAPTION}
          onChange={onChange}
          pagination={pagination}
          columns={columns}
          data-test-subj="similar-cases-table"
          itemId="id"
          items={cases}
          noItemsMessage={
            <EuiEmptyPrompt
              title={<h3>{i18n.NO_CASES}</h3>}
              titleSize="xs"
              body={i18n.NO_CASES_BODY}
            />
          }
          rowProps={tableRowProps}
        />
      )}
    </>
  );
};
SimilarCasesTable.displayName = 'SimilarCasesTable';
