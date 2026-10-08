/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';

/**
 * Mirrors `FLYOUT_MIN_CELL_WIDTH` and `FLYOUT_MAX_GRID_COLUMNS` in
 * `@kbn/flyout-info-blocks`, to estimate an initial width that allows 4 info blocks
 * to be displayed in one line
 */
const INFO_BLOCKS_MIN_CELL_WIDTH = 140;
const INFO_BLOCKS_COLUMNS = 4;

export const useAlertDetailsFlyoutWidth = () => {
  const { euiTheme } = useEuiTheme();

  return INFO_BLOCKS_COLUMNS * INFO_BLOCKS_MIN_CELL_WIDTH + euiTheme.base * 2;
};
