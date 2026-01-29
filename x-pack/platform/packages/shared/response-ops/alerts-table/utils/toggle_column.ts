/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridColumn } from '@elastic/eui';

const remove = <T>(array: T[], index: number) => {
  return [...array.slice(0, index), ...array.slice(index + 1)];
};

const insert = ({
  columnId,
  columns,
  defaultColumns,
}: {
  columnId: string;
  columns: EuiDataGridColumn[];
  defaultColumns: EuiDataGridColumn[];
}): EuiDataGridColumn[] => {
  const defaultIndex = defaultColumns.findIndex(({ id }) => id === columnId);
  const isInDefaultConfig = defaultIndex >= 0;
  const newColumn = defaultColumns[defaultIndex];

  // If the column isn't shown, but it's part of the default config insert into the same position
  // as in the default config and with the same default config (i.e. display name)
  if (isInDefaultConfig) {
    return [...columns.slice(0, defaultIndex), { ...newColumn }, ...columns.slice(defaultIndex)];
  }

  if (columns.length === 0) {
    return [{ id: columnId }];
  }

  // If the column isn't shown, and it's not part of the default config
  // push it into the second position. Behaviour copied by t_grid, security
  // does this to insert right after the timestamp column
  return [columns[0], { id: columnId }, ...columns.slice(1)];
};

export const toggleColumn = ({
  columnId,
  columns,
  defaultColumns,
}: {
  /**
   * The id of the column to be removed/inserted
   */
  columnId: string;
  /**
   * The current columns configuration
   */
  columns: EuiDataGridColumn[];
  /**
   * The default columns configuration, used to determine the position of the column
   * when inserting it back in
   */
  defaultColumns: EuiDataGridColumn[];
}): EuiDataGridColumn[] => {
  const currentIndex = columns.findIndex(({ id }) => id === columnId);
  const isVisible = currentIndex >= 0;

  if (isVisible) {
    return remove(columns, currentIndex);
  }

  return insert({ defaultColumns, columnId, columns });
};

export const toggleVisibleColumn = ({
  columnId,
  visibleColumns,
  defaultVisibleColumns,
  columns,
}: {
  columnId: string;
  visibleColumns: string[];
  defaultVisibleColumns: string[];
  columns: EuiDataGridColumn[];
}): string[] => {
  const isVisible = visibleColumns.includes(columnId);
  const isEnabled = columns.some((col) => col.id === columnId);

  if (isVisible) {
    return isEnabled ? visibleColumns : visibleColumns.filter((vc) => vc !== columnId);
  } else {
    const defaultIndex = defaultVisibleColumns.findIndex((id) => id === columnId);

    if (defaultIndex >= 0) {
      // If the column isn't shown, but it's part of the default config, show it in the same
      // position as in the default config
      return [
        ...visibleColumns.slice(0, defaultIndex),
        columnId,
        ...visibleColumns.slice(defaultIndex),
      ];
    }
    return [visibleColumns[0], columnId, ...visibleColumns.slice(1)];
  }
};
