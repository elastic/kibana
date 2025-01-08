/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useContext, useMemo } from 'react';
import { AlertsTableContext } from '../contexts/alerts_table_context';
import { UseActionsColumnRegistry, BulkActionsVerbs } from '../../../../types';

const DEFAULT_ACTIONS_COLUMNS_WIDTH = 75;

interface UseActionsColumnProps {
  options?: UseActionsColumnRegistry;
}

export const useActionsColumn = ({ options }: UseActionsColumnProps) => {
  const {
    bulkActions: [, updateBulkActionsState],
  } = useContext(AlertsTableContext);

  const defaultActionsColum = useCallback(
    () => ({
      renderCustomActionsRow: undefined,
      width: undefined,
    }),
    []
  );

  const useUserActionsColumn = options ? options : defaultActionsColum;

  const { renderCustomActionsRow, width: actionsColumnWidth = DEFAULT_ACTIONS_COLUMNS_WIDTH } =
    useUserActionsColumn();

  // we save the rowIndex when creating the function to be used by the clients
  // so they don't have to manage it
  const getSetIsActionLoadingCallback = useCallback(
    (rowIndex: number) =>
      (isLoading: boolean = true) => {
        updateBulkActionsState({
          action: BulkActionsVerbs.updateRowLoadingState,
          rowIndex,
          isLoading,
        });
      },
    [updateBulkActionsState]
  );

  return useMemo(() => {
    return {
      renderCustomActionsRow,
      actionsColumnWidth,
      getSetIsActionLoadingCallback,
    };
  }, [renderCustomActionsRow, actionsColumnWidth, getSetIsActionLoadingCallback]);
};
