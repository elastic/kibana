/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-views-plugin/common';
import { patternAnalysisEmbeddableStateSchema } from '@kbn/aiops-server-schemas/embeddables/pattern_analysis';
import { PATTERN_ANALYSIS_DATA_VIEW_REF_NAME } from '@kbn/aiops-log-pattern-analysis/constants';
import { transformIn } from './transform_in';
import { transformOut } from './transform_out';
import { toStoredMinimumTimeRange, toUiMinimumTimeRange } from './normalize_legacy_state';
import type { StoredPatternAnalysisEmbeddableState } from './types';

describe('pattern analysis embeddable transforms', () => {
  // ── Schema validation ────────────────────────────────────────────────────────

  it('validates the dashboard-as-code schema and applies defaults', () => {
    const state = patternAnalysisEmbeddableStateSchema.validate({
      data_view_id: 'data-view-id',
      field_name: 'message',
    });

    expect(state).toEqual({
      data_view_id: 'data-view-id',
      field_name: 'message',
      minimum_time_range: 'no_minimum',
      random_sampler_mode: 'on_automatic',
      random_sampler_probability: null,
    });
  });

  it('rejects unsupported minimum_time_range values', () => {
    expect(() =>
      patternAnalysisEmbeddableStateSchema.validate({
        data_view_id: 'data-view-id',
        field_name: 'message',
        minimum_time_range: 'No minimum',
      })
    ).toThrow();
  });

  it('rejects missing data_view_id', () => {
    expect(() =>
      patternAnalysisEmbeddableStateSchema.validate({
        field_name: 'message',
      })
    ).toThrow();
  });

  it('rejects missing field_name', () => {
    expect(() =>
      patternAnalysisEmbeddableStateSchema.validate({
        data_view_id: 'data-view-id',
      })
    ).toThrow();
  });

  it('rejects empty data_view_id', () => {
    expect(() =>
      patternAnalysisEmbeddableStateSchema.validate({
        data_view_id: '',
        field_name: 'message',
      })
    ).toThrow();
  });

  it('rejects on_manual mode with null random_sampler_probability', () => {
    expect(() =>
      patternAnalysisEmbeddableStateSchema.validate({
        data_view_id: 'data-view-id',
        field_name: 'message',
        random_sampler_mode: 'on_manual',
        random_sampler_probability: null,
      })
    ).toThrow('`random_sampler_probability` must be set when `random_sampler_mode` is `on_manual`');
  });

  it('rejects random_sampler_probability above MAX_SAMPLER_PROBABILITY', () => {
    expect(() =>
      patternAnalysisEmbeddableStateSchema.validate({
        data_view_id: 'data-view-id',
        field_name: 'message',
        random_sampler_mode: 'on_manual',
        random_sampler_probability: 0.7,
      })
    ).toThrow();
  });

  it('accepts on_manual mode with a valid random_sampler_probability', () => {
    const state = patternAnalysisEmbeddableStateSchema.validate({
      data_view_id: 'data-view-id',
      field_name: 'message',
      random_sampler_mode: 'on_manual',
      random_sampler_probability: 0.1,
    });

    expect(state.random_sampler_probability).toBe(0.1);
  });

  // ── transformIn ──────────────────────────────────────────────────────────────

  it('extracts the data view reference and stores canonical minimum_time_range', () => {
    expect(
      transformIn({
        data_view_id: 'data-view-id',
        field_name: 'message',
        minimum_time_range: '1_week',
        random_sampler_mode: 'on_automatic',
        random_sampler_probability: null,
      })
    ).toEqual({
      state: {
        field_name: 'message',
        minimum_time_range: '1_week',
        random_sampler_mode: 'on_automatic',
        random_sampler_probability: null,
      },
      references: [
        {
          id: 'data-view-id',
          name: PATTERN_ANALYSIS_DATA_VIEW_REF_NAME,
          type: DATA_VIEW_SAVED_OBJECT_TYPE,
        },
      ],
    });
  });

  it('maps all UI minimum_time_range values to canonical values', () => {
    const cases: Array<[string, string]> = [
      ['No minimum', 'no_minimum'],
      ['1 week', '1_week'],
      ['1 month', '1_month'],
      ['3 months', '3_months'],
      ['6 months', '6_months'],
    ];

    for (const [uiValue, snakeValue] of cases) {
      expect(toStoredMinimumTimeRange(uiValue)).toBe(snakeValue);
    }
  });

  // ── transformOut ─────────────────────────────────────────────────────────────

  it('normalizes legacy camelCase stored state to snake_case runtime state', () => {
    const legacyStoredState = {
      title: 'Pattern analysis',
      timeRange: { from: 'now-7d', to: 'now' },
      hidePanelTitles: true,
      fieldName: 'message',
      minimumTimeRangeOption: '1 week',
      randomSamplerMode: 'on_manual',
      randomSamplerProbability: 0.1,
    } as unknown as StoredPatternAnalysisEmbeddableState;

    expect(
      transformOut(legacyStoredState, [
        {
          id: 'data-view-id',
          name: PATTERN_ANALYSIS_DATA_VIEW_REF_NAME,
          type: DATA_VIEW_SAVED_OBJECT_TYPE,
        },
      ])
    ).toEqual({
      data_view_id: 'data-view-id',
      field_name: 'message',
      minimum_time_range: '1_week',
      random_sampler_mode: 'on_manual',
      random_sampler_probability: 0.1,
      hide_title: true,
      time_range: { from: 'now-7d', to: 'now' },
      title: 'Pattern analysis',
    });
  });

  it('keeps snake_case minimum_time_range values canonical in runtime state', () => {
    const cases: Array<[string, string]> = [
      ['no_minimum', 'no_minimum'],
      ['1_week', '1_week'],
      ['1_month', '1_month'],
      ['3_months', '3_months'],
      ['6_months', '6_months'],
    ];

    for (const [snakeValue, canonicalValue] of cases) {
      const result = transformOut(
        {
          field_name: 'message',
          minimum_time_range: snakeValue as 'no_minimum',
          random_sampler_mode: 'on_automatic',
          random_sampler_probability: null,
        },
        [
          {
            id: 'data-view-id',
            name: PATTERN_ANALYSIS_DATA_VIEW_REF_NAME,
            type: DATA_VIEW_SAVED_OBJECT_TYPE,
          },
        ]
      );
      expect(result.minimum_time_range).toBe(canonicalValue);
    }
  });

  it('maps canonical minimum_time_range values to UI values for controls', () => {
    expect(toUiMinimumTimeRange('no_minimum')).toBe('No minimum');
    expect(toUiMinimumTimeRange('1_week')).toBe('1 week');
    expect(toUiMinimumTimeRange('1_month')).toBe('1 month');
    expect(toUiMinimumTimeRange('3_months')).toBe('3 months');
    expect(toUiMinimumTimeRange('6_months')).toBe('6 months');
  });

  it('throws when stored state is missing the data view reference', () => {
    const storedState: StoredPatternAnalysisEmbeddableState = {
      field_name: 'message',
      minimum_time_range: 'no_minimum',
      random_sampler_mode: 'on_automatic',
      random_sampler_probability: null,
    };

    expect(() => transformOut(storedState, [])).toThrow(
      'Invalid pattern analysis embeddable state: missing data_view_id reference'
    );
  });

  it('throws when stored state is missing field_name', () => {
    const storedState = {
      minimum_time_range: 'no_minimum',
      random_sampler_mode: 'on_automatic',
      random_sampler_probability: null,
    } as unknown as StoredPatternAnalysisEmbeddableState;

    expect(() =>
      transformOut(storedState, [
        {
          id: 'data-view-id',
          name: PATTERN_ANALYSIS_DATA_VIEW_REF_NAME,
          type: DATA_VIEW_SAVED_OBJECT_TYPE,
        },
      ])
    ).toThrow('Invalid pattern analysis embeddable state: missing field_name');
  });
});
