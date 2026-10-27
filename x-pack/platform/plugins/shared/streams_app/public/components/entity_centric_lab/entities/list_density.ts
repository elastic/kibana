/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridStyle } from '@elastic/eui';

/** Page-level density for inventory list tables and hex map cards. */
export type ListDensity = 'compact' | 'normal' | 'expanded';

export const DEFAULT_LIST_DENSITY: ListDensity = 'normal';

export const isListDensity = (value: unknown): value is ListDensity =>
  value === 'compact' || value === 'normal' || value === 'expanded';

const DENSITY_CELL_STYLE: Record<
  ListDensity,
  Pick<EuiDataGridStyle, 'fontSize' | 'cellPadding'>
> = {
  compact: { fontSize: 's', cellPadding: 's' },
  normal: { fontSize: 'm', cellPadding: 'm' },
  expanded: { fontSize: 'l', cellPadding: 'l' },
};

/** Merge density font/padding onto the shared list-grid chrome style. */
export const getListGridStyle = (density: ListDensity): EuiDataGridStyle => ({
  border: 'horizontal',
  header: 'shade',
  stripes: false,
  ...DENSITY_CELL_STYLE[density],
});

/** Hex map card panel padding only — density does not touch other hex spacing. */
export const getHexPanelPadding = (density: ListDensity): 's' | 'm' | 'l' => {
  switch (density) {
    case 'compact':
      return 's';
    case 'expanded':
      return 'l';
    case 'normal':
    default:
      return 'm';
  }
};
