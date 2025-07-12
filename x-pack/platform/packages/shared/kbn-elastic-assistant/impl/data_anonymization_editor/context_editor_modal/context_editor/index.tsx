/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiInMemoryTable } from '@elastic/eui';
import type { EuiSearchBarProps, EuiTableSelectionType } from '@elastic/eui';
import React, { useMemo, useState, useRef } from 'react';

import { FindAnonymizationFieldsResponse } from '@kbn/elastic-assistant-common/impl/schemas';
import styled from '@emotion/styled';
import { BatchUpdateListItem, ContextEditorRow, FIELDS } from '../../context_editor/types';
import { useAssistantContext } from '../../../assistant_context';
import { getColumns } from '../../context_editor/get_columns';
import { ANONYMIZATION_PROMPT_CONTEXT_TABLE_SESSION_STORAGE_KEY } from '../../../assistant_context/constants';
import {
  getDefaultTableOptions,
  useSessionPagination,
} from '../../../assistant/common/components/assistant_settings_management/pagination/use_session_pagination';
import { getRows } from '../../context_editor/get_rows';
import { ALLOWED, ANONYMIZED } from '../../context_editor/translations';
import { Toolbar } from '../toolbar';

const Wrapper = styled.div`
  > div > .euiSpacer {
    block-size: 16px;
  }
`;

export interface Props {
  anonymizationFields: FindAnonymizationFieldsResponse;
  compressed?: boolean;
  onListUpdated: (updates: BatchUpdateListItem[]) => void;
  rawData: Record<string, string[]> | null;
}

const search: EuiSearchBarProps = {
  box: {
    incremental: true,
  },
  filters: [
    {
      field: FIELDS.ALLOWED,
      type: 'is',
      name: ALLOWED,
    },
    {
      field: FIELDS.ANONYMIZED,
      type: 'is',
      name: ANONYMIZED,
    },
  ],
};

const ContextEditorComponent: React.FC<Props> = ({
  anonymizationFields,
  compressed = true,
  onListUpdated,
  rawData,
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
    () =>
      getColumns({
        compressed,
        handleRowChecked: () => {},
        hasUpdateAIAssistantAnonymization,
        onListUpdated,
        rawData,
        selectedFields: selected.map((row) => row.field),
      }),
    [compressed, hasUpdateAIAssistantAnonymization, onListUpdated, rawData, selected]
  );

  const rows = useMemo(
    () =>
      getRows({
        anonymizationFields,
        rawData,
      }),
    [anonymizationFields, rawData]
  );

  const { onTableChange, pagination, sorting } = useSessionPagination<ContextEditorRow, true>({
    defaultTableOptions: getDefaultTableOptions<ContextEditorRow>({
      pageSize: 10,
      sortDirection: 'asc',
      sortField: 'field',
    }),
    nameSpace,
    storageKey: ANONYMIZATION_PROMPT_CONTEXT_TABLE_SESSION_STORAGE_KEY,
  });

  const toolbar = useMemo(
    () => (
      <Toolbar
        handleRowChecked={(field) => {
          const selectedRow = rows.find((row) => row.field === field);
          if (!selectedRow) return;
          setSelection((prevSelection) => [...prevSelection, selectedRow]);
        }}
        onListUpdated={onListUpdated}
        selectedFields={selected.map((row) => row.field)}
      />
    ),
    [onListUpdated, rows, selected]
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
