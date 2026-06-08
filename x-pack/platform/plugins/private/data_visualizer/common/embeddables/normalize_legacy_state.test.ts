/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeFieldStatsLegacyFields } from './normalize_legacy_state';

describe('normalizeFieldStatsLegacyFields', () => {
  it('maps legacy camelCase fields to the snake_case shape', () => {
    expect(
      normalizeFieldStatsLegacyFields({
        dataViewId: 'data-view-id',
        viewType: 'esql',
        showDistributions: true,
        query: { esql: 'FROM logs' },
      })
    ).toEqual({
      data_view_id: 'data-view-id',
      view_type: 'esql',
      show_distributions: true,
      query: { esql: 'FROM logs' },
    });
  });

  it('prefers snake_case values over their legacy camelCase counterparts', () => {
    expect(
      normalizeFieldStatsLegacyFields({
        data_view_id: 'new-id',
        dataViewId: 'old-id',
        view_type: 'esql',
        viewType: 'dataview',
        show_distributions: true,
        showDistributions: false,
        query: { esql: 'FROM logs' },
      })
    ).toEqual({
      data_view_id: 'new-id',
      view_type: 'esql',
      show_distributions: true,
      query: { esql: 'FROM logs' },
    });
  });

  it('falls back to defaults when both forms are missing', () => {
    expect(normalizeFieldStatsLegacyFields({})).toEqual({
      data_view_id: undefined,
      view_type: 'dataview',
      show_distributions: false,
      query: undefined,
    });
  });
});
