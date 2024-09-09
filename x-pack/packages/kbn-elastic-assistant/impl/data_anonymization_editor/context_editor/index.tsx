/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiInMemoryTable } from '@elastic/eui';
import type { EuiSearchBarProps, EuiTableSelectionType } from '@elastic/eui';
import React, { useCallback, useMemo, useState, useRef } from 'react';

import { FindAnonymizationFieldsResponse } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/find_anonymization_fields_route.gen';
import styled from '@emotion/styled';
import { getColumns } from './get_columns';
import { getRows } from './get_rows';
import { Toolbar } from './toolbar';
import * as i18n from './translations';
import { BatchUpdateListItem, ContextEditorRow, FIELDS, SortConfig } from './types';
import { useAssistantContext } from '../../assistant_context';
import { useSessionPagination } from '../../assistant/common/components/assistant_settings_management/pagination/use_session_pagination';
import { ANONYMIZATION_TABLE_SESSION_STORAGE_KEY } from '../../assistant_context/constants';

const DEFAULT_PAGE_SIZE = 10;

const Wrapper = styled.div`
  > div > .euiSpacer {
    block-size: 16px;
  }
`;

const defaultSort: SortConfig = {
  sort: {
    direction: 'asc',
    field: FIELDS.FIELD,
  },
};

export const DEFAULT_TABLE_OPTIONS = {
  page: { size: DEFAULT_PAGE_SIZE, index: 0 },
  ...defaultSort,
};

export interface Props {
  anonymizationFields: FindAnonymizationFieldsResponse;
  compressed?: boolean;
  onListUpdated: (updates: BatchUpdateListItem[]) => void;
  rawData: Record<string, string[]> | null;
  pageSize?: number;
}

const search: EuiSearchBarProps = {
  box: {
    incremental: true,
  },
  filters: [
    {
      field: FIELDS.ALLOWED,
      type: 'is',
      name: i18n.ALLOWED,
    },
    {
      field: FIELDS.ANONYMIZED,
      type: 'is',
      name: i18n.ANONYMIZED,
    },
  ],
};

const ContextEditorComponent: React.FC<Props> = ({
  anonymizationFields,
  compressed = true,
  onListUpdated,
  rawData,
  pageSize = DEFAULT_PAGE_SIZE,
}) => {
  const isAllSelected = useRef(false); // Must be a ref and not state in order not to re-render `selectionValue`, which fires `onSelectionChange` twice
  const {
    assistantAvailability: { hasUpdateAIAssistantAnonymization },
    nameSpace,
  } = useAssistantContext();
  const [selected, setSelection] = useState<ContextEditorRow[]>([]);
  const selectionValue: EuiTableSelectionType<ContextEditorRow> = useMemo(
    () => ({
      selectable: () => true,
      onSelectionChange: (newSelection) => {
        if (isAllSelected.current === true) {
          // If passed every possible row (including non-visible ones), EuiInMemoryTable
          // will fire `onSelectionChange` with only the visible rows - we need to
          // ignore this call when that happens and continue to pass all rows
          isAllSelected.current = false;
        } else {
          setSelection(newSelection);
        }
      },
      selected,
    }),
    [selected]
  );

  const columns = useMemo(
    () => getColumns({ onListUpdated, rawData, hasUpdateAIAssistantAnonymization, compressed }),
    [hasUpdateAIAssistantAnonymization, onListUpdated, rawData, compressed]
  );

  const rows = useMemo(
    () =>
      getRows({
        anonymizationFields,
        rawData,
      }),
    [anonymizationFields, rawData]
  );

  const onSelectAll = useCallback(() => {
    isAllSelected.current = true;
    setSelection(rows);
  }, [rows]);

  const { onTableChange, pagination, sorting } = useSessionPagination({
    defaultTableOptions: DEFAULT_TABLE_OPTIONS,
    nameSpace,
    storageKey: ANONYMIZATION_TABLE_SESSION_STORAGE_KEY,
  });

  const toolbar = useMemo(
    () => (
      <Toolbar
        onListUpdated={onListUpdated}
        onSelectAll={onSelectAll}
        selected={selected}
        totalFields={rawData == null ? anonymizationFields.total : Object.keys(rawData).length}
      />
    ),
    [anonymizationFields.total, onListUpdated, onSelectAll, rawData, selected]
  );

  return (
    <Wrapper>
      <EuiInMemoryTable
        allowNeutralSort={false}
        childrenBetween={hasUpdateAIAssistantAnonymization ? toolbar : undefined}
        columns={columns}
        compressed={compressed}
        data-test-subj="contextEditor"
        itemId={FIELDS.FIELD}
        items={rows}
        pagination={pagination}
        search={search}
        selection={selectionValue}
        sorting={sorting}
        onTableChange={onTableChange}
      />
    </Wrapper>
  );
};

ContextEditorComponent.displayName = 'ContextEditorComponent';
export const ContextEditor = React.memo(ContextEditorComponent);
