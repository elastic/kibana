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

/** Always shown as the first column; not part of the column selection. */
export const EPISODES_TABLE_TIME_COLUMN_ID = '@timestamp';

/** Columns users can show, hide, and reorder, in default display order. */
export const EPISODES_TABLE_COLUMN_IDS = [
  'episode.status',
  'alerting_source',
  'severity',
  'rule.id',
  'reason',
  'duration',
  'tags',
  'rule_tags',
  'assignees',
  'suppressed',
] as const;

export type EpisodesTableColumnId = (typeof EPISODES_TABLE_COLUMN_IDS)[number];

export const DEFAULT_EPISODES_TABLE_VISIBLE_COLUMNS: string[] = [...EPISODES_TABLE_COLUMN_IDS];

const COLUMN_ID_SET: ReadonlySet<string> = new Set(EPISODES_TABLE_COLUMN_IDS);

export const isEpisodesTableColumnId = (value: unknown): value is EpisodesTableColumnId =>
  typeof value === 'string' && COLUMN_ID_SET.has(value);

/**
 * Turns a stored value into a valid, de-duplicated, ordered list of column ids, or `undefined` when
 * nothing in it is usable. An empty list is kept: the grid then shows only the time column, plus its
 * document summary column when the data view has a time field.
 */
export const resolveEpisodesTableVisibleColumns = (stored: unknown): string[] | undefined => {
  const knownIds = Array.isArray(stored)
    ? [...new Set(stored.filter(isEpisodesTableColumnId))]
    : [];
  const isUsable = Array.isArray(stored) && (stored.length === 0 || knownIds.length > 0);
  return isUsable ? knownIds : undefined;
};

export const DEFAULT_EPISODES_TABLE_SORT: EpisodesTableConfig['sort'] = {
  sortField: EPISODES_TABLE_TIME_COLUMN_ID,
  sortDirection: 'desc',
};

/** Falls back to the default sort when the sorted column is hidden, which the grid shows no indicator for. */
export const resolveSortForVisibleColumns = (
  sort: EpisodesTableConfig['sort'],
  visibleColumns: string[]
): EpisodesTableConfig['sort'] =>
  sort.sortField === EPISODES_TABLE_TIME_COLUMN_ID || visibleColumns.includes(sort.sortField)
    ? sort
    : DEFAULT_EPISODES_TABLE_SORT;

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
