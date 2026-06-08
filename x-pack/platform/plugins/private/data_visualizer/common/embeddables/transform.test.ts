/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-views-plugin/common';
import { fieldStatsEmbeddableStateSchema } from '@kbn/data-visualizer-server-schemas/embeddables/field_stats';
import { transformIn } from './transform_in';
import { transformOut } from './transform_out';
import { FIELD_STATS_DATA_VIEW_REF_NAME } from './constants';
import type { StoredFieldStatisticsTableEmbeddableState } from './types';

describe('field stats embeddable transforms', () => {
  describe('schema validation', () => {
    it('validates the dashboard-as-code schema and applies defaults', () => {
      const state = fieldStatsEmbeddableStateSchema.validate({
        data_view_id: 'data-view-id',
      });

      expect(state).toEqual({
        data_view_id: 'data-view-id',
        view_type: 'dataview',
        show_distributions: false,
      });
    });

    it('accepts ES|QL mode with a query', () => {
      const state = fieldStatsEmbeddableStateSchema.validate({
        view_type: 'esql',
        query: { esql: 'FROM logs' },
      });

      expect(state).toEqual({
        view_type: 'esql',
        query: { esql: 'FROM logs' },
        show_distributions: false,
      });
    });

    it('defaults view_type to dataview when omitted', () => {
      const state = fieldStatsEmbeddableStateSchema.validate({
        data_view_id: 'dv-1',
      });
      expect(state.view_type).toBe('dataview');
    });

    it('defaults show_distributions to false when omitted', () => {
      const state = fieldStatsEmbeddableStateSchema.validate({
        data_view_id: 'dv-1',
      });
      expect(state.show_distributions).toBe(false);
    });

    it('rejects unsupported view_type values', () => {
      expect(() =>
        fieldStatsEmbeddableStateSchema.validate({
          data_view_id: 'dv-1',
          view_type: 'sql',
        })
      ).toThrow();
    });
  });

  describe('transformIn', () => {
    it('extracts the data view reference from snake_case state', () => {
      expect(
        transformIn({
          data_view_id: 'data-view-id',
          view_type: 'dataview',
          show_distributions: true,
        })
      ).toEqual({
        state: {
          view_type: 'dataview',
          show_distributions: true,
        },
        references: [
          {
            id: 'data-view-id',
            name: FIELD_STATS_DATA_VIEW_REF_NAME,
            type: DATA_VIEW_SAVED_OBJECT_TYPE,
          },
        ],
      });
    });

    it('returns empty references when data_view_id is undefined', () => {
      expect(
        transformIn({
          view_type: 'esql',
          query: { esql: 'FROM logs' },
          show_distributions: false,
        })
      ).toEqual({
        state: {
          view_type: 'esql',
          query: { esql: 'FROM logs' },
          show_distributions: false,
        },
        references: [],
      });
    });
  });

  describe('transformOut', () => {
    it('reconstructs the data view id from references', () => {
      const storedState: StoredFieldStatisticsTableEmbeddableState = {
        view_type: 'dataview',
        show_distributions: true,
      };

      expect(
        transformOut(storedState, [
          {
            id: 'data-view-id',
            name: FIELD_STATS_DATA_VIEW_REF_NAME,
            type: DATA_VIEW_SAVED_OBJECT_TYPE,
          },
        ])
      ).toEqual({
        data_view_id: 'data-view-id',
        view_type: 'dataview',
        show_distributions: true,
      });
    });

    it('normalizes legacy camelCase stored state to snake_case', () => {
      const legacyStoredState = {
        title: 'Field stats',
        timeRange: { from: 'now-7d', to: 'now' },
        hidePanelTitles: true,
        viewType: 'esql',
        showDistributions: true,
        query: { esql: 'FROM logs' },
      } as unknown as StoredFieldStatisticsTableEmbeddableState;

      expect(
        transformOut(legacyStoredState, [
          {
            id: 'data-view-id',
            name: FIELD_STATS_DATA_VIEW_REF_NAME,
            type: DATA_VIEW_SAVED_OBJECT_TYPE,
          },
        ])
      ).toEqual({
        data_view_id: 'data-view-id',
        hide_title: true,
        query: { esql: 'FROM logs' },
        show_distributions: true,
        time_range: { from: 'now-7d', to: 'now' },
        title: 'Field stats',
        view_type: 'esql',
      });
    });

    it('handles ES|QL mode without a data view reference', () => {
      const storedState: StoredFieldStatisticsTableEmbeddableState = {
        view_type: 'esql',
        query: { esql: 'FROM logs' },
        show_distributions: false,
      };

      expect(transformOut(storedState, [])).toEqual({
        view_type: 'esql',
        query: { esql: 'FROM logs' },
        show_distributions: false,
      });
    });
  });
});
