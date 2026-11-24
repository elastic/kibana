/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EuiDataGridColumn,
  EuiDataGridToolBarVisibilityColumnSelectorOptions,
} from '@elastic/eui';
import {
  getColumnSelectorOrder,
  type EpisodesTableColumnId,
} from '../../utils/episodes_table_config';
import {
  DURATION_FIELD_LABEL,
  RULE_FIELD_LABEL,
  SEVERITY_FIELD_LABEL,
  STATUS_FIELD_LABEL,
} from '../../hooks/translations';
import {
  EPISODES_LIST_COLUMN_ALERT_TAGS,
  EPISODES_LIST_COLUMN_ASSIGNEES,
  EPISODES_LIST_COLUMN_REASON,
  EPISODES_LIST_COLUMN_RULE_TAGS,
  EPISODES_LIST_COLUMN_SOURCE,
  EPISODES_LIST_COLUMN_SUPPRESSED,
} from '../translations';

/*
 * Matches the grid header text: data view custom labels for status, severity, rule, and duration,
 * `CUSTOM_GRID_COLUMNS_CONFIGURATION` for the rest, and the raw field name for the time column.
 */
export const EPISODES_TABLE_COLUMN_LABELS: Readonly<Record<EpisodesTableColumnId, string>> = {
  'episode.status': STATUS_FIELD_LABEL,
  alerting_source: EPISODES_LIST_COLUMN_SOURCE,
  severity: SEVERITY_FIELD_LABEL,
  '@timestamp': '@timestamp',
  'rule.id': RULE_FIELD_LABEL,
  reason: EPISODES_LIST_COLUMN_REASON,
  duration: DURATION_FIELD_LABEL,
  tags: EPISODES_LIST_COLUMN_ALERT_TAGS,
  rule_tags: EPISODES_LIST_COLUMN_RULE_TAGS,
  assignees: EPISODES_LIST_COLUMN_ASSIGNEES,
  suppressed: EPISODES_LIST_COLUMN_SUPPRESSED,
};

/*
 * The EUI column selector keeps its own column order and re-seeds it only when `availableColumns`
 * changes identity. Rebuilding this list whenever the visible columns change keeps that order in
 * line with header moves, which go through the grid's own selector instead.
 */
export const getSelectorColumns = (visibleColumns: string[]): EuiDataGridColumn[] =>
  getColumnSelectorOrder(visibleColumns).map((id) => ({ id }));

export const SELECTOR_OPTIONS: EuiDataGridToolBarVisibilityColumnSelectorOptions = {
  allowHide: true,
  allowReorder: true,
};
