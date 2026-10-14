/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeLogRateAnalysisLegacyFields } from './normalize_legacy_state';

describe('normalizeLogRateAnalysisLegacyFields', () => {
  it('maps legacy camelCase fields to the snake_case shape', () => {
    expect(
      normalizeLogRateAnalysisLegacyFields({
        dataViewId: 'data-view-id',
      })
    ).toEqual({
      data_view_id: 'data-view-id',
    });
  });

  it('prefers snake_case values over their legacy camelCase counterparts', () => {
    expect(
      normalizeLogRateAnalysisLegacyFields({
        data_view_id: 'new-id',
        dataViewId: 'old-id',
      })
    ).toEqual({
      data_view_id: 'new-id',
    });
  });

  it('returns undefined when both forms are missing', () => {
    expect(normalizeLogRateAnalysisLegacyFields({})).toEqual({
      data_view_id: undefined,
    });
  });
});
