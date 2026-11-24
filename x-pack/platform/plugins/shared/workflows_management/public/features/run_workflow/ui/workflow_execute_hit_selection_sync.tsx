/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext, useEffect, useRef } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { UnifiedDataTableContext } from '@kbn/unified-data-table/src/table_context';

export interface WorkflowExecuteHitSelectionSyncProps {
  dataTableRows: DataTableRecord[];
  onSelectionChange: (selectedRecords: DataTableRecord[]) => void;
  setErrors?: (errors: string | null) => void;
}

/**
 * Mirrors UnifiedDataTable checkbox selection into parent form state (alert / document tabs).
 */
export const WorkflowExecuteHitSelectionSync = ({
  dataTableRows,
  onSelectionChange,
  setErrors,
}: WorkflowExecuteHitSelectionSyncProps) => {
  const { selectedDocsState } = useContext(UnifiedDataTableContext);
  const selectedStateRef = useRef(selectedDocsState);
  selectedStateRef.current = selectedDocsState;

  const docIdsKey = (selectedDocsState?.docIdsInSelectionOrder ?? []).join('\0');

  useEffect(() => {
    const docIds = selectedStateRef.current?.docIdsInSelectionOrder ?? [];
    if (docIds.length === 0) {
      onSelectionChange([]);
      setErrors?.(null);
      return;
    }

    const selectedRecords = docIds
      .map((docId) => dataTableRows.find((row) => row.id === docId))
      .filter((row): row is DataTableRecord => row !== undefined);

    if (selectedRecords.length !== docIds.length) {
      onSelectionChange([]);
      setErrors?.(null);
      return;
    }

    onSelectionChange(selectedRecords);
    setErrors?.(null);
  }, [dataTableRows, docIdsKey, onSelectionChange, setErrors]);

  return null;
};

WorkflowExecuteHitSelectionSync.displayName = 'WorkflowExecuteHitSelectionSync';
