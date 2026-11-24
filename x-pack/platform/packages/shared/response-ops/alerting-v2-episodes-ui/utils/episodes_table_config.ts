/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod';
import { ROWS_HEIGHT_OPTIONS } from '@kbn/unified-data-table';

const episodesTableColumnSettingSchema = lazySchema(() =>
  z.object({
    width: z.number().optional(),
    display: z.string().optional(),
  })
);

// Bounds the row height to a valid line count (`auto` is -1). Values come from the URL and
// localStorage, so an unbounded check would let a bad value render absurdly tall rows. Mirrors
// @kbn/unified-data-table's `isValidRowHeight`, which isn't exported for reuse.
const rowHeightSchema = lazySchema(() => z.number().int().min(-1).max(20));

/**
 * One field per persisted display option. Add more fields here as more options are persisted —
 * the consumer's decode/encode validate and serialize per-field automatically.
 */
export const episodesTableConfigSchema = lazySchema(() =>
  z.object({
    visibleColumns: z.array(z.string()),
    sort: z.object({
      sortField: z.string().min(1),
      sortDirection: z.enum(['asc', 'desc']),
    }),
    rowHeight: rowHeightSchema,
    columnSettings: z.record(z.string(), episodesTableColumnSettingSchema),
  })
);

export type EpisodesTableConfig = z.infer<typeof episodesTableConfigSchema>;
export type EpisodesTableColumnSettings = EpisodesTableConfig['columnSettings'];

/** Every column the episodes table can show, in default display order. */
export const EPISODES_TABLE_COLUMN_IDS = [
  'episode.status',
  'alerting_source',
  'severity',
  '@timestamp',
  'rule.id',
  'reason',
  'duration',
  'tags',
  'rule_tags',
  'assignees',
  'suppressed',
] as const;

export type EpisodesTableColumnId = (typeof EPISODES_TABLE_COLUMN_IDS)[number];

export const EPISODES_TABLE_TIME_COLUMN_ID = '@timestamp' satisfies EpisodesTableColumnId;

export const DEFAULT_EPISODES_TABLE_VISIBLE_COLUMNS: string[] = [...EPISODES_TABLE_COLUMN_IDS];

const COLUMN_ID_SET: ReadonlySet<string> = new Set(EPISODES_TABLE_COLUMN_IDS);

export const isEpisodesTableColumnId = (value: unknown): value is EpisodesTableColumnId =>
  typeof value === 'string' && COLUMN_ID_SET.has(value);

/**
 * Full column order for the column selector: hidden columns keep their default slots and visible
 * columns fill the remaining slots in display order.
 */
export const getColumnSelectorOrder = (visibleColumns: string[]): EpisodesTableColumnId[] => {
  const visibleIds = [...new Set(visibleColumns.filter(isEpisodesTableColumnId))];
  const visibleSet = new Set<string>(visibleIds);
  let nextVisibleIndex = 0;
  return EPISODES_TABLE_COLUMN_IDS.map((columnId) =>
    visibleSet.has(columnId) ? visibleIds[nextVisibleIndex++] : columnId
  );
};

/**
 * Turns a stored value into a valid, de-duplicated, ordered list of column ids. An empty list is
 * kept: the grid then shows its document summary column.
 */
export const resolveEpisodesTableVisibleColumns = (stored: unknown): string[] => {
  const storedIds: unknown[] = Array.isArray(stored) ? stored : [];
  const knownIds = [...new Set(storedIds.filter(isEpisodesTableColumnId))];
  const isUnusable = !Array.isArray(stored) || (storedIds.length > 0 && knownIds.length === 0);
  return isUnusable ? [...DEFAULT_EPISODES_TABLE_VISIBLE_COLUMNS] : knownIds;
};

export const DEFAULT_EPISODES_TABLE_SORT: EpisodesTableConfig['sort'] = {
  sortField: '@timestamp',
  sortDirection: 'desc',
};

/**
 * Falls back to the default sort when a non-default sort targets a hidden column, because the
 * grid shows no sort indicator for hidden columns.
 */
export const resolveSortForVisibleColumns = (
  sort: EpisodesTableConfig['sort'],
  visibleColumns: string[]
): EpisodesTableConfig['sort'] => {
  const isDefaultSort =
    sort.sortField === DEFAULT_EPISODES_TABLE_SORT.sortField &&
    sort.sortDirection === DEFAULT_EPISODES_TABLE_SORT.sortDirection;
  return visibleColumns.includes(sort.sortField) || isDefaultSort
    ? sort
    : DEFAULT_EPISODES_TABLE_SORT;
};

export const DEFAULT_EPISODES_TABLE_COLUMN_SETTINGS: EpisodesTableColumnSettings = {
  duration: { width: 110 },
  assignees: { width: 120 },
  'episode.status': { width: 110 },
  alerting_source: { width: 140 },
  severity: { width: 100 },
  suppressed: { width: 250 },
  reason: { width: 260 },
};

export const DEFAULT_EPISODES_TABLE_CONFIG: EpisodesTableConfig = {
  visibleColumns: DEFAULT_EPISODES_TABLE_VISIBLE_COLUMNS,
  sort: DEFAULT_EPISODES_TABLE_SORT,
  rowHeight: ROWS_HEIGHT_OPTIONS.default,
  columnSettings: DEFAULT_EPISODES_TABLE_COLUMN_SETTINGS,
};
