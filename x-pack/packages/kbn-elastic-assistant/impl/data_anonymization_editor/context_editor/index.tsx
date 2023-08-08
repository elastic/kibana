/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiInMemoryTable } from '@elastic/eui';
import type { EuiSearchBarProps, EuiTableSelectionType } from '@elastic/eui';
import React, { useCallback, useMemo, useRef, useState } from 'react';

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
  allow: string[];
  allowReplacement: string[];
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
  allow,
  allowReplacement,
  onListUpdated,
  onReset,
  rawData,
  pageSize = DEFAULT_PAGE_SIZE,
}) => {
  const [selected, setSelection] = useState<ContextEditorRow[]>([]);
  const selectionValue: EuiTableSelectionType<ContextEditorRow> = useMemo(
    () => ({
      selectable: () => true,
      onSelectionChange: (newSelection) => setSelection(newSelection),
      initialSelected: [],
    }),
    []
  );
  const tableRef = useRef<EuiInMemoryTable<ContextEditorRow> | null>(null);

  const columns = useMemo(() => getColumns({ onListUpdated, rawData }), [onListUpdated, rawData]);

  const rows = useMemo(
    () =>
      getRows({
        allow,
        allowReplacement,
        rawData,
      }),
    [allow, allowReplacement, rawData]
  );

  const onSelectAll = useCallback(() => {
    tableRef.current?.setSelection(rows); // updates selection in the EuiInMemoryTable

    setTimeout(() => setSelection(rows), 0); // updates selection in the component state
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
        totalFields={rows.length}
      />
    ),
    [onListUpdated, onReset, onSelectAll, rawData, rows.length, selected]
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
      ref={tableRef}
      search={search}
      selection={selectionValue}
      sorting={defaultSort}
    />
  );
};

ContextEditorComponent.displayName = 'ContextEditorComponent';
export const ContextEditor = React.memo(ContextEditorComponent);
