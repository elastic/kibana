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
    visibleColumns: z.array(z.string()).min(1),
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

export const DEFAULT_EPISODES_TABLE_VISIBLE_COLUMNS: string[] = [
  'episode.status',
  'alerting_source',
  'severity',
  '@timestamp',
  'rule.id',
  'duration',
  'tags',
  'rule_tags',
  'assignees',
  'suppressed',
];

export const DEFAULT_EPISODES_TABLE_SORT: EpisodesTableConfig['sort'] = {
  sortField: '@timestamp',
  sortDirection: 'desc',
};

export const DEFAULT_EPISODES_TABLE_COLUMN_SETTINGS: EpisodesTableColumnSettings = {
  duration: { width: 110 },
  assignees: { width: 120 },
  'episode.status': { width: 110 },
  alerting_source: { width: 140 },
  severity: { width: 100 },
  suppressed: { width: 250 },
};

export const DEFAULT_EPISODES_TABLE_CONFIG: EpisodesTableConfig = {
  visibleColumns: DEFAULT_EPISODES_TABLE_VISIBLE_COLUMNS,
  sort: DEFAULT_EPISODES_TABLE_SORT,
  rowHeight: ROWS_HEIGHT_OPTIONS.default,
  columnSettings: DEFAULT_EPISODES_TABLE_COLUMN_SETTINGS,
};
