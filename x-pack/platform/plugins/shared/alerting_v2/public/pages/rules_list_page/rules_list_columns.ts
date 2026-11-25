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
import { ALERTING_V2_RULES_APP_ID, ALERTING_V2_SECTION_ID } from '@kbn/alerting-v2-constants';
import { i18n } from '@kbn/i18n';

/** Columns users can show, hide, and reorder. Name, selection, and actions are always shown. */
export const RULES_LIST_COLUMN_IDS = ['source', 'tags', 'routingTags', 'kind', 'enabled'] as const;

export type RulesListColumnId = (typeof RULES_LIST_COLUMN_IDS)[number];

export const DEFAULT_VISIBLE_COLUMN_IDS: readonly RulesListColumnId[] = RULES_LIST_COLUMN_IDS;

export const RULES_LIST_VISIBLE_COLUMNS_STORAGE_KEY =
  `${ALERTING_V2_SECTION_ID}.${ALERTING_V2_RULES_APP_ID}.rulesListVisibleColumns` as const;

export const RULES_LIST_DEFAULT_SORT = { field: 'name', direction: 'asc' } as const;

/** Maps a Content List sort field to the optional column that displays it. */
export const SORT_FIELD_TO_COLUMN_ID: Readonly<Partial<Record<string, RulesListColumnId>>> = {
  kind: 'kind',
  enabled: 'enabled',
};

export const RULES_LIST_COLUMN_LABELS: Readonly<Record<RulesListColumnId, string>> = {
  source: i18n.translate('xpack.alertingV2.rulesList.column.source', {
    defaultMessage: 'Source',
  }),
  tags: i18n.translate('xpack.alertingV2.rulesList.column.tags', {
    defaultMessage: 'Tags',
  }),
  routingTags: i18n.translate('xpack.alertingV2.rulesList.column.routingTags', {
    defaultMessage: 'Routing tags',
  }),
  kind: i18n.translate('xpack.alertingV2.rulesList.column.kind', {
    defaultMessage: 'Outcome',
  }),
  enabled: i18n.translate('xpack.alertingV2.rulesList.column.enabled', {
    defaultMessage: 'Enabled',
  }),
};

/*
 * Module-level so the identity never changes: the EUI column selector resets its
 * internal order state whenever `availableColumns` changes identity.
 */
export const SELECTOR_COLUMNS: EuiDataGridColumn[] = RULES_LIST_COLUMN_IDS.map((id) => ({ id }));

export const SELECTOR_OPTIONS: EuiDataGridToolBarVisibilityColumnSelectorOptions = {
  allowHide: true,
  allowReorder: true,
};

const COLUMN_ID_SET: ReadonlySet<string> = new Set(RULES_LIST_COLUMN_IDS);

export const isRulesListColumnId = (value: unknown): value is RulesListColumnId =>
  typeof value === 'string' && COLUMN_ID_SET.has(value);

/** Turns a stored value into a valid, de-duplicated, ordered list of visible column ids. */
export const resolveVisibleColumnIds = (stored: unknown): RulesListColumnId[] => {
  if (!Array.isArray(stored)) {
    return [...DEFAULT_VISIBLE_COLUMN_IDS];
  }
  const knownIds = [...new Set(stored.filter(isRulesListColumnId))];
  if (stored.length > 0 && knownIds.length === 0) {
    return [...DEFAULT_VISIBLE_COLUMN_IDS];
  }
  return knownIds;
};
