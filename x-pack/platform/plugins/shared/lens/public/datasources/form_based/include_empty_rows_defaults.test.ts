/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LENS_DATASOURCE_ID,
  LENS_DATATABLE_ID,
  LENS_GAUGE_ID,
  LENS_HEATMAP_CHART_SHAPES,
  LENS_METRIC_ID,
  PARTITION_CHART_TYPES,
  SeriesTypes,
  type FormBasedPrivateState,
  type LensDocument,
} from '@kbn/lens-common';
import {
  applyEmptyRowsDefaultsOnTypeSwitch,
  applyEmptyRowsDefaultsToSuggestionState,
  getDefaultIncludeEmptyRows,
} from './include_empty_rows_defaults';

describe('getDefaultIncludeEmptyRows', () => {
  describe.each([
    [SeriesTypes.BAR, false],
    [LENS_HEATMAP_CHART_SHAPES.HEATMAP, false],
    [PARTITION_CHART_TYPES.PIE, false],
    [PARTITION_CHART_TYPES.TREEMAP, false],
    [PARTITION_CHART_TYPES.MOSAIC, false],
    [PARTITION_CHART_TYPES.WAFFLE, false],
    [LENS_METRIC_ID, false],
    ['lnsTagcloud', false],
  ])('OFF-by-default visualization type %s', (visualizationTypeId, expected) => {
    it(`returns ${expected}`, () => {
      expect(getDefaultIncludeEmptyRows(visualizationTypeId)).toBe(expected);
    });
  });

  describe.each([
    [LENS_DATATABLE_ID, true],
    // Line and area XY subtypes remain ON until #256104 changes them.
    [SeriesTypes.LINE, true],
    [SeriesTypes.AREA, true],
    // Mixed XY layers (multi-layer different seriesType) stay ON by default.
    ['mixed', true],
    // Visualizations not covered by the issue keep the historical default.
    [LENS_GAUGE_ID, true],
    ['lnsLegacyMetric', true],
  ])('ON-by-default visualization type %s', (visualizationTypeId, expected) => {
    it(`returns ${expected}`, () => {
      expect(getDefaultIncludeEmptyRows(visualizationTypeId)).toBe(expected);
    });
  });

  it('returns true when no visualization type id is provided', () => {
    expect(getDefaultIncludeEmptyRows(undefined)).toBe(true);
    expect(getDefaultIncludeEmptyRows('')).toBe(true);
  });

  it('returns true for an unknown visualization type id', () => {
    expect(getDefaultIncludeEmptyRows('some-future-vis-id')).toBe(true);
  });
});

describe('applyEmptyRowsDefaultsToSuggestionState', () => {
  function makeState(
    layers: Record<
      string,
      Record<
        string,
        {
          operationType: string;
          params?: { includeEmptyRows?: boolean };
        }
      >
    >
  ): FormBasedPrivateState {
    return {
      currentIndexPatternId: 'ip',
      layers: Object.fromEntries(
        Object.entries(layers).map(([layerId, columns]) => [
          layerId,
          {
            indexPatternId: 'ip',
            columnOrder: Object.keys(columns),
            columns: Object.fromEntries(
              Object.entries(columns).map(([columnId, column]) => [
                columnId,
                {
                  dataType: 'date',
                  isBucketed: true,
                  label: columnId,
                  sourceField: '@timestamp',
                  operationType: column.operationType,
                  params: column.params,
                } as unknown as Record<string, unknown>,
              ])
            ),
          },
        ])
      ),
    } as unknown as FormBasedPrivateState;
  }

  it('does nothing when the target visualization defaults to includeEmptyRows on', () => {
    const suggestion = makeState({
      first: { col1: { operationType: 'date_histogram' } },
    });

    expect(applyEmptyRowsDefaultsToSuggestionState(suggestion, undefined, LENS_DATATABLE_ID)).toBe(
      suggestion
    );
  });

  it('flips a newly created date_histogram column to includeEmptyRows false for bar charts', () => {
    const suggestion = makeState({
      first: { col1: { operationType: 'date_histogram' } },
    });
    const previous = makeState({ first: {} });

    const next = applyEmptyRowsDefaultsToSuggestionState(suggestion, previous, SeriesTypes.BAR);

    expect(next).not.toBe(suggestion);
    expect(
      (next.layers.first.columns.col1 as { params?: { includeEmptyRows?: boolean } }).params
        ?.includeEmptyRows
    ).toBe(false);
  });

  it('preserves columns that already existed in the previous datasource state', () => {
    const suggestion = makeState({
      first: {
        existing: { operationType: 'date_histogram', params: { includeEmptyRows: true } },
        added: { operationType: 'date_histogram' },
      },
    });
    const previous = makeState({
      first: {
        existing: { operationType: 'date_histogram', params: { includeEmptyRows: true } },
      },
    });

    const next = applyEmptyRowsDefaultsToSuggestionState(
      suggestion,
      previous,
      PARTITION_CHART_TYPES.PIE
    );

    expect(
      (next.layers.first.columns.existing as { params?: { includeEmptyRows?: boolean } }).params
        ?.includeEmptyRows
    ).toBe(true);
    expect(
      (next.layers.first.columns.added as { params?: { includeEmptyRows?: boolean } }).params
        ?.includeEmptyRows
    ).toBe(false);
  });

  it('leaves non-bucket columns untouched', () => {
    const suggestion = makeState({
      first: { col1: { operationType: 'terms' } },
    });

    expect(applyEmptyRowsDefaultsToSuggestionState(suggestion, undefined, SeriesTypes.BAR)).toBe(
      suggestion
    );
  });
});

describe('applyEmptyRowsDefaultsOnTypeSwitch', () => {
  function makeState(
    layers: Record<
      string,
      Record<
        string,
        {
          operationType: string;
          params?: { includeEmptyRows?: boolean };
        }
      >
    >
  ): FormBasedPrivateState {
    return {
      currentIndexPatternId: 'ip',
      layers: Object.fromEntries(
        Object.entries(layers).map(([layerId, columns]) => [
          layerId,
          {
            indexPatternId: 'ip',
            columnOrder: Object.keys(columns),
            columns: Object.fromEntries(
              Object.entries(columns).map(([columnId, column]) => [
                columnId,
                {
                  dataType: 'date',
                  isBucketed: true,
                  label: columnId,
                  sourceField: '@timestamp',
                  operationType: column.operationType,
                  params: column.params,
                } as unknown as Record<string, unknown>,
              ])
            ),
          },
        ])
      ),
    } as unknown as FormBasedPrivateState;
  }

  function makePersistedDoc(
    layers: Record<
      string,
      Record<string, { operationType: string; params?: { includeEmptyRows?: boolean } }>
    >
  ): LensDocument {
    return {
      state: {
        datasourceStates: {
          [LENS_DATASOURCE_ID.FORM_BASED]: {
            layers: Object.fromEntries(
              Object.entries(layers).map(([layerId, columns]) => [
                layerId,
                {
                  columnOrder: Object.keys(columns),
                  columns,
                },
              ])
            ),
          },
        },
      },
    } as unknown as LensDocument;
  }

  it('retains a session-set value when there is no persisted baseline (never-saved viz)', () => {
    // The user deliberately turned empty rows off; a type switch must not flip it
    // back on just because the visualization was never saved.
    const suggestion = makeState({
      first: { col1: { operationType: 'date_histogram', params: { includeEmptyRows: false } } },
    });

    const next = applyEmptyRowsDefaultsOnTypeSwitch(suggestion, undefined, LENS_DATATABLE_ID);

    expect(next).toBe(suggestion);
    expect(
      (next.layers.first.columns.col1 as { params?: { includeEmptyRows?: boolean } }).params
        ?.includeEmptyRows
    ).toBe(false);
  });

  it('retains the column when its value equals the persisted (stored) value', () => {
    const suggestion = makeState({
      first: { col1: { operationType: 'date_histogram', params: { includeEmptyRows: true } } },
    });
    const persistedDoc = makePersistedDoc({
      first: { col1: { operationType: 'date_histogram', params: { includeEmptyRows: true } } },
    });

    const next = applyEmptyRowsDefaultsOnTypeSwitch(suggestion, persistedDoc, SeriesTypes.BAR);

    expect(next).toBe(suggestion);
    expect(
      (next.layers.first.columns.col1 as { params?: { includeEmptyRows?: boolean } }).params
        ?.includeEmptyRows
    ).toBe(true);
  });

  it('treats a missing persisted value as the historical default of true', () => {
    const suggestion = makeState({
      first: { col1: { operationType: 'date_histogram', params: { includeEmptyRows: true } } },
    });
    // Persisted column omits includeEmptyRows -> normalized to true, equal to live value.
    const persistedDoc = makePersistedDoc({
      first: { col1: { operationType: 'date_histogram' } },
    });

    const next = applyEmptyRowsDefaultsOnTypeSwitch(suggestion, persistedDoc, SeriesTypes.BAR);

    expect(next).toBe(suggestion);
  });

  it('overwrites with the target default when the live value diverges from the persisted value', () => {
    const suggestion = makeState({
      first: { col1: { operationType: 'date_histogram', params: { includeEmptyRows: false } } },
    });
    const persistedDoc = makePersistedDoc({
      first: { col1: { operationType: 'date_histogram', params: { includeEmptyRows: true } } },
    });

    // Datatable defaults to ON; the diverged live value (false) is overwritten back to true.
    const next = applyEmptyRowsDefaultsOnTypeSwitch(suggestion, persistedDoc, LENS_DATATABLE_ID);

    expect(next).not.toBe(suggestion);
    expect(
      (next.layers.first.columns.col1 as { params?: { includeEmptyRows?: boolean } }).params
        ?.includeEmptyRows
    ).toBe(true);
  });

  it('overrides a diverged value with the target default when switching to a datatable', () => {
    // Saved as OFF, live value flipped to ON only by carrying over a previous
    // series type's default -> datatable forces it back to its ON default.
    const suggestion = makeState({
      first: { col1: { operationType: 'date_histogram', params: { includeEmptyRows: false } } },
    });
    const persistedDoc = makePersistedDoc({
      first: { col1: { operationType: 'date_histogram', params: { includeEmptyRows: true } } },
    });

    const next = applyEmptyRowsDefaultsOnTypeSwitch(suggestion, persistedDoc, LENS_DATATABLE_ID);

    expect(
      (next.layers.first.columns.col1 as { params?: { includeEmptyRows?: boolean } }).params
        ?.includeEmptyRows
    ).toBe(true);
  });

  it('applies the same divergence rule to range (histogram) columns', () => {
    const suggestion = makeState({
      first: { col1: { operationType: 'range', params: { includeEmptyRows: true } } },
    });
    const persistedDoc = makePersistedDoc({
      first: { col1: { operationType: 'range', params: { includeEmptyRows: false } } },
    });

    const next = applyEmptyRowsDefaultsOnTypeSwitch(
      suggestion,
      persistedDoc,
      PARTITION_CHART_TYPES.PIE
    );

    expect(
      (next.layers.first.columns.col1 as { params?: { includeEmptyRows?: boolean } }).params
        ?.includeEmptyRows
    ).toBe(false);
  });

  it('leaves non-bucket columns untouched', () => {
    const suggestion = makeState({
      first: { metric: { operationType: 'count' } },
    });

    const next = applyEmptyRowsDefaultsOnTypeSwitch(suggestion, undefined, SeriesTypes.BAR);

    expect(next).toBe(suggestion);
  });

  it('retains a session-added column while overriding a diverged persisted column in the same layer', () => {
    // `saved` was persisted ON but its live value diverged to OFF (carried over),
    // so it is forced to bar's OFF default. `added` has no persisted baseline, so
    // its session value is kept.
    const suggestion = makeState({
      first: {
        saved: { operationType: 'date_histogram', params: { includeEmptyRows: true } },
        added: { operationType: 'date_histogram', params: { includeEmptyRows: true } },
      },
    });
    const persistedDoc = makePersistedDoc({
      first: { saved: { operationType: 'date_histogram', params: { includeEmptyRows: false } } },
    });

    const next = applyEmptyRowsDefaultsOnTypeSwitch(suggestion, persistedDoc, SeriesTypes.BAR);

    expect(
      (next.layers.first.columns.saved as { params?: { includeEmptyRows?: boolean } }).params
        ?.includeEmptyRows
    ).toBe(false);
    expect(
      (next.layers.first.columns.added as { params?: { includeEmptyRows?: boolean } }).params
        ?.includeEmptyRows
    ).toBe(true);
  });
});
