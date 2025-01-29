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
import { EuiEmptyPrompt, EuiSkeletonText, EuiBasicTable, useEuiTheme } from '@elastic/eui';

import type { SimilarCaseUI } from '../../../common/ui/types';

import * as i18n from './translations';
import { useSimilarCasesColumns } from './use_similar_cases_columns';

export interface SimilarCasesTableProps {
  cases: SimilarCaseUI[];
  isLoading: boolean;
  onChange: EuiBasicTableProps<SimilarCaseUI>['onChange'];
  pagination: Pagination;
}

export const SimilarCasesTable: FunctionComponent<SimilarCasesTableProps> = ({
  cases,
  isLoading,
  onChange,
  pagination,
}) => {
  const { euiTheme } = useEuiTheme();

  const { columns } = useSimilarCasesColumns();

  const tableRowProps = useCallback(
    (theCase: SimilarCaseUI) => ({
      'data-test-subj': `similar-cases-table-row-${theCase.id}`,
    }),
    []
  );

  return isLoading ? (
    <div
      css={css`
        margin-top: ${euiTheme.size.m};
      `}
    >
      <EuiSkeletonText data-test-subj="similar-cases-table-loading" lines={10} />
    </div>
  ) : (
    <>
      <EuiBasicTable
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
    </>
  );
};
SimilarCasesTable.displayName = 'SimilarCasesTable';
