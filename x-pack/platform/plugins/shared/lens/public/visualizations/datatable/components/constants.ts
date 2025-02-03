/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RowHeightMode } from '../../../../common/types';

export const LENS_EDIT_SORT_ACTION = 'sort';
export const LENS_EDIT_RESIZE_ACTION = 'resize';
export const LENS_TOGGLE_ACTION = 'toggle';
export const LENS_EDIT_PAGESIZE_ACTION = 'pagesize';
export const DEFAULT_HEADER_ROW_HEIGHT_LINES = 3;
export const DEFAULT_HEADER_ROW_HEIGHT = RowHeightMode.custom;
export const DEFAULT_ROW_HEIGHT = RowHeightMode.custom;
export const DEFAULT_ROW_HEIGHT_LINES = 1;

export enum ROW_HEIGHT_LINES_KEYS {
  rowHeightLines = 'rowHeightLines',
  headerRowHeightLines = 'headerRowHeightLines',
}
