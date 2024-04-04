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
import { getColumns } from './get_columns';
import { getRows } from './get_rows';
import { Toolbar } from './toolbar';
import * as i18n from './translations';
import { BatchUpdateListItem, ContextEditorRow, FIELDS, SortConfig } from './types';

export const DEFAULT_PAGE_SIZE = 10;

const defaultSort: SortConfig = {
  sort: {
    direction: 'desc',
    field: FIELDS.ALLOWED,
  },
};

export interface Props {
  anonymizationFields: FindAnonymizationFieldsResponse;
  onListUpdated: (updates: BatchUpdateListItem[]) => void;
  onReset?: () => void;
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
  onListUpdated,
  onReset,
  rawData,
  pageSize = DEFAULT_PAGE_SIZE,
}) => {
  const isAllSelected = useRef(false); // Must be a ref and not state in order not to re-render `selectionValue`, which fires `onSelectionChange` twice
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

  const columns = useMemo(() => getColumns({ onListUpdated, rawData }), [onListUpdated, rawData]);

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

  const pagination = useMemo(() => {
    return {
      initialPageSize: pageSize,
      pageSizeOptions: [5, DEFAULT_PAGE_SIZE, 25, 50],
    };
  }, [pageSize]);

  const toolbar = useMemo(
    () => (
      <Toolbar
        onListUpdated={onListUpdated}
        onlyDefaults={rawData == null}
        onReset={onReset}
        onSelectAll={onSelectAll}
        selected={selected}
        totalFields={rawData == null ? anonymizationFields.total : Object.keys(rawData).length}
      />
    ),
    [anonymizationFields.total, onListUpdated, onReset, onSelectAll, rawData, selected]
  );

  return (
    <EuiInMemoryTable
      allowNeutralSort={false}
      childrenBetween={toolbar}
      columns={columns}
      compressed={true}
      data-test-subj="contextEditor"
      isSelectable={true}
      itemId={FIELDS.FIELD}
      items={rows}
      pagination={pagination}
      search={search}
      selection={selectionValue}
      sorting={defaultSort}
    />
  );
};

ContextEditorComponent.displayName = 'ContextEditorComponent';
export const ContextEditor = React.memo(ContextEditorComponent);
