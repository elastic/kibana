/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ImportResponse, ImportStatsItem } from '@kbn/alerting-v2-schemas';
import {
  isImportContentListItem,
  joinImportsWithStats,
  toImportContentListItem,
} from './imports_data_source';

const createImport = (id: string): ImportResponse => ({
  id,
  name: `Import ${id}`,
  kind: 'custom',
  enabled: true,
  source: id,
  connector_id: `c-${id}`,
  workflow_id: `w-${id}`,
  tags: [],
  routing_tags: [],
  created_by: { profile_uid: 'u' },
  created_at: '2026-01-01T00:00:00.000Z',
  updated_by: null,
  updated_at: '2026-01-02T00:00:00.000Z',
});

const createStats = (id: string): ImportStatsItem => ({
  id,
  status: 'receiving',
  alert_series_count: 2,
  last_alert_at: '2026-01-02T00:00:00.000Z',
  connector_exists: true,
  receiving_events: true,
  workflow_exists: true,
  workflow_enabled: true,
  last_execution: null,
});

describe('joinImportsWithStats', () => {
  it('joins by id and leaves stats undefined when the stats call has no row', () => {
    const joined = joinImportsWithStats([createImport('a'), createImport('b')], [createStats('b')]);

    expect(joined.map(({ import: item, stats }) => [item.id, stats?.id])).toEqual([
      ['a', undefined],
      ['b', 'b'],
    ]);
  });
});

describe('toImportContentListItem', () => {
  it('keeps the import and its stats on the item and passes the type guard', () => {
    const item = toImportContentListItem({ import: createImport('a'), stats: createStats('a') });

    expect(item.title).toBe('Import a');
    expect(isImportContentListItem(item)).toBe(true);
    expect(isImportContentListItem({ id: 'x', title: 'x' })).toBe(false);
  });
});
