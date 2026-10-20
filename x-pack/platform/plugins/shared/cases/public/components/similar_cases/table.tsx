/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useMemo } from 'react';
import { css } from '@emotion/react';
import type { EuiBasicTableProps, Pagination } from '@elastic/eui';
import { EuiEmptyPrompt, EuiSkeletonText, EuiBasicTable, useEuiTheme } from '@elastic/eui';

import { FieldType } from '../../../common/types/domain/template/fields';
import type { SimilarCaseUI } from '../../../common/ui/types';
import type { CasesColumnSelection } from '../all_cases/types';
import { useCasesConfig } from '../../common/lib/kibana';
import { useBulkGetUserProfiles } from '../../containers/user_profiles/use_bulk_get_user_profiles';
import { useGetCaseConfiguration } from '../../containers/configure/use_get_case_configuration';
import { useGetSupportedActionConnectors } from '../../containers/configure/use_get_supported_action_connectors';
import {
  getExtendedFieldColumnKey,
  getUserPickerUidsFromCase,
} from '../all_cases/components/extended_field_columns';
import { useGlobalInlineFields } from '../all_cases/hooks/use_global_inline_fields';

import * as i18n from './translations';
import { useSimilarCasesColumns } from './use_similar_cases_columns';

export interface SimilarCasesTableProps {
  cases: SimilarCaseUI[];
  isLoading: boolean;
  onChange: EuiBasicTableProps<SimilarCaseUI>['onChange'];
  pagination: Pagination;
  selectedColumns: CasesColumnSelection[];
  sorting?: EuiBasicTableProps<SimilarCaseUI>['sorting'];
}

export const SimilarCasesTable: FunctionComponent<SimilarCasesTableProps> = ({
  cases,
  isLoading,
  onChange,
  pagination,
  selectedColumns,
  sorting,
}) => {
  const { euiTheme } = useEuiTheme();

  const {
    data: { customFields },
  } = useGetCaseConfiguration();

  const { templatesEnabled } = useCasesConfig();
  const { globalInlineFields } = useGlobalInlineFields({ enabled: templatesEnabled });
  const { data: connectors } = useGetSupportedActionConnectors();

  // Only the checked columns show avatars, so only they need profiles.
  const checkedFields = useMemo(
    () => new Set(selectedColumns.filter(({ isChecked }) => isChecked).map(({ field }) => field)),
    [selectedColumns]
  );
  const userPickerFields = useMemo(
    () =>
      globalInlineFields.filter(
        (field) =>
          field.control === FieldType.USER_PICKER &&
          checkedFields.has(getExtendedFieldColumnKey(field))
      ),
    [globalInlineFields, checkedFields]
  );

  const profileUids = useMemo(() => {
    const uids = new Set<string>();

    cases.forEach((theCase) => {
      if (checkedFields.has('assignees')) {
        theCase.assignees.forEach(({ uid }) => uids.add(uid));
      }
      getUserPickerUidsFromCase(theCase, userPickerFields).forEach((uid) => uids.add(uid));
    });

    return Array.from(uids);
  }, [cases, checkedFields, userPickerFields]);
  const { data: userProfiles } = useBulkGetUserProfiles({ uids: profileUids });

  const { columns } = useSimilarCasesColumns({
    selectedColumns,
    customFields,
    userProfiles,
    connectors,
  });

  const tableRowProps = useCallback(
    (theCase: SimilarCaseUI) => ({
      'data-test-subj': `similar-cases-table-row-${theCase.id}`,
    }),
    []
  );

  return (
    <>
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
          sorting={sorting}
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
          tableLayout="auto"
          scrollableInline
          responsiveBreakpoint={false}
        />
      )}
    </>
  );
};
SimilarCasesTable.displayName = 'SimilarCasesTable';
