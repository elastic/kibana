/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { CriteriaWithPagination, EuiBasicTableColumn } from '@elastic/eui';
import { EuiBasicTable, EuiSpacer } from '@elastic/eui';
import { KbnInfoCallout } from '@kbn/ui-callout';
import { Status } from '@kbn/cases-components/src/status/status';
import type { CaseUI, SortOrder } from '../../../../../../common/ui/types';
import { SortFieldCase } from '../../../../../../common/ui/types';
import type { ObservableWithMetadata } from '../../../../../../common/types/api';
import { useFindCasesByObservable } from '../../../../../containers/use_find_cases_by_observable';
import { CaseDetailsLink } from '../../../../links';
import { TruncatedText } from '../../../../truncated_text';
import { SeverityHealth } from '../../../../severity/config';
import { tableColumnPresetDateRelative } from '../../../../../utils/table_column_presets';
import * as casesI18n from '../../../../all_cases/translations';
import { OBSERVABLE_CASES_PAGE_SIZE_OPTIONS } from '../../constants';
import * as i18n from '../../translations';

interface ObservableCasesSort {
  field: SortFieldCase;
  direction: SortOrder;
}

const DEFAULT_SORT: ObservableCasesSort = { field: SortFieldCase.createdAt, direction: 'desc' };

const isSortFieldCase = (field: unknown): field is SortFieldCase =>
  Object.values<unknown>(SortFieldCase).includes(field);

// Cases open in a new tab, so the flyout and its place in the table stay as they are.
const columns: Array<EuiBasicTableColumn<CaseUI>> = [
  {
    field: 'title',
    name: casesI18n.NAME,
    sortable: true,
    minWidth: '12em',
    render: (title: string, { id }: CaseUI) => (
      <CaseDetailsLink detailName={id} title={title} openInNewTab>
        <TruncatedText text={title} />
      </CaseDetailsLink>
    ),
  },
  {
    field: 'status',
    name: casesI18n.STATUS,
    sortable: true,
    width: '110px',
    render: (status: CaseUI['status']) => <Status status={status} />,
  },
  {
    field: 'severity',
    name: casesI18n.SEVERITY,
    sortable: true,
    minWidth: '6em',
    render: (severity: CaseUI['severity']) => <SeverityHealth severity={severity} />,
  },
  {
    ...tableColumnPresetDateRelative({ stripMs: true }),
    field: 'createdAt',
    name: casesI18n.CREATED_ON,
    sortable: true,
  },
  {
    ...tableColumnPresetDateRelative({ stripMs: true }),
    field: 'updatedAt',
    name: casesI18n.UPDATED_ON,
    sortable: true,
  },
];

export interface ObservableCasesTableProps {
  observable: Pick<ObservableWithMetadata, 'typeKey' | 'value'>;
  caseData: Pick<CaseUI, 'id' | 'owner'>;
}

/**
 * The other cases holding the observable, paged and sorted on the server. A case opens in a new
 * tab.
 */
export const ObservableCasesTable = ({
  observable: { typeKey, value },
  caseData: { id: caseId, owner },
}: ObservableCasesTableProps) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState<number>(OBSERVABLE_CASES_PAGE_SIZE_OPTIONS[0]);
  const [sort, setSort] = useState<ObservableCasesSort>(DEFAULT_SORT);

  const { data, isFetching, isError } = useFindCasesByObservable({
    owner,
    typeKey,
    value,
    excludeCaseId: caseId,
    page: pageIndex + 1,
    perPage: pageSize,
    sortField: sort.field,
    sortOrder: sort.direction,
  });

  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
      totalItemCount: data?.total ?? 0,
      pageSizeOptions: OBSERVABLE_CASES_PAGE_SIZE_OPTIONS,
    }),
    [data?.total, pageIndex, pageSize]
  );

  const onTableChange = useCallback(
    ({ page, sort: nextSort }: CriteriaWithPagination<CaseUI>) => {
      if (nextSort != null && isSortFieldCase(nextSort.field)) {
        const { field, direction } = nextSort;
        setSort({ field, direction });
      }
      // A new sort or page size starts again from the first page.
      const isNewOrder =
        (nextSort != null &&
          (nextSort.field !== sort.field || nextSort.direction !== sort.direction)) ||
        page.size !== pageSize;
      setPageIndex(isNewOrder ? 0 : page.index);
      setPageSize(page.size);
    },
    [pageSize, sort.direction, sort.field]
  );

  return (
    <>
      {data?.totalRelation === 'gte' ? (
        <>
          <KbnInfoCallout
            size="s"
            title={i18n.CASES_LIST_CAPPED_TITLE(data.total)}
            text={i18n.CASES_LIST_CAPPED_DESCRIPTION}
            data-test-subj="cases-observable-cases-capped"
          />
          <EuiSpacer size="s" />
        </>
      ) : null}
      <EuiBasicTable
        tableCaption={i18n.CASES_TABLE_CAPTION}
        items={data?.cases ?? []}
        itemId="id"
        columns={columns}
        loading={isFetching}
        error={isError ? i18n.OTHER_CASES_ERROR : undefined}
        noItemsMessage={isFetching ? i18n.LOADING : i18n.NO_CASES}
        pagination={pagination}
        sorting={{ sort }}
        onChange={onTableChange}
        data-test-subj="cases-observable-cases-table"
      />
    </>
  );
};

ObservableCasesTable.displayName = 'ObservableCasesTable';
