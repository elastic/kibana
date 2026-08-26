/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-views-plugin/common';
import { logRateAnalysisEmbeddableStateSchema } from '@kbn/aiops-server-schemas/embeddables/log_rate_analysis';
import { LOG_RATE_ANALYSIS_DATA_VIEW_REF_NAME } from '@kbn/aiops-log-rate-analysis/constants';
import { transformIn } from './transform_in';
import { transformOut } from './transform_out';
import type { StoredLogRateAnalysisEmbeddableState } from './types';

describe('log rate analysis embeddable transforms', () => {
  it('validates the dashboard-as-code schema', () => {
    const state = logRateAnalysisEmbeddableStateSchema.parse({
      data_view_id: 'data-view-id',
    });

    expect(state).toEqual({
      data_view_id: 'data-view-id',
    });
  });

  it('rejects an empty data_view_id', () => {
    expect(() =>
      logRateAnalysisEmbeddableStateSchema.parse({
        data_view_id: '',
      })
    ).toThrow();
  });

  it('extracts the data view reference from snake_case state', () => {
    expect(
      transformIn({
        data_view_id: 'data-view-id',
      })
    ).toEqual({
      state: {},
      references: [
        {
          id: 'data-view-id',
          name: LOG_RATE_ANALYSIS_DATA_VIEW_REF_NAME,
          type: DATA_VIEW_SAVED_OBJECT_TYPE,
        },
      ],
    });
  });

  it('rebuilds runtime state from the data view reference', () => {
    expect(
      transformOut({} as StoredLogRateAnalysisEmbeddableState, [
        {
          id: 'data-view-id',
          name: LOG_RATE_ANALYSIS_DATA_VIEW_REF_NAME,
          type: DATA_VIEW_SAVED_OBJECT_TYPE,
        },
      ])
    ).toEqual({
      data_view_id: 'data-view-id',
    });
  });

  it('normalizes legacy camelCase stored state to snake_case API state', () => {
    const legacyStoredState = {
      title: 'Log rate analysis',
      timeRange: { from: 'now-7d', to: 'now' },
      hidePanelTitles: true,
      dataViewId: 'data-view-id',
    } as unknown as StoredLogRateAnalysisEmbeddableState;

    expect(transformOut(legacyStoredState, [])).toEqual({
      data_view_id: 'data-view-id',
      hide_title: true,
      time_range: { from: 'now-7d', to: 'now' },
      title: 'Log rate analysis',
    });
  });

  it('prefers the data view reference over a legacy inline dataViewId', () => {
    const legacyStoredState = {
      dataViewId: 'inline-id',
    } as unknown as StoredLogRateAnalysisEmbeddableState;

    expect(
      transformOut(legacyStoredState, [
        {
          id: 'ref-id',
          name: LOG_RATE_ANALYSIS_DATA_VIEW_REF_NAME,
          type: DATA_VIEW_SAVED_OBJECT_TYPE,
        },
      ])
    ).toEqual({
      data_view_id: 'ref-id',
    });
  });

  it('throws when stored state is missing the data view reference and legacy id', () => {
    expect(() => transformOut({} as StoredLogRateAnalysisEmbeddableState, [])).toThrow(
      'Invalid log rate analysis embeddable state: missing data_view_id reference'
    );
  });
});
