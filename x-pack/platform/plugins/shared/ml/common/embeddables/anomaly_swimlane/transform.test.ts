/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnomalySwimLaneEmbeddableState } from '@kbn/ml-server-schemas/embeddables/anomaly_swimlane';
import { anomalySwimLaneEmbeddableStateSchema } from '@kbn/ml-server-schemas/embeddables/anomaly_swimlane';
import { transformIn } from './transform_in';
import { transformOut } from './transform_out';

describe('anomaly swim lane embeddable transforms', () => {
  describe('schema', () => {
    it('accepts an overall swim lane', () => {
      const state = anomalySwimLaneEmbeddableStateSchema.validate({
        job_ids: ['job-1'],
        swimlane_type: 'overall',
      });

      expect(state).toEqual({
        job_ids: ['job-1'],
        swimlane_type: 'overall',
      });
    });

    it('accepts a view-by swim lane', () => {
      const state = anomalySwimLaneEmbeddableStateSchema.validate({
        job_ids: ['job-1', 'job-2'],
        swimlane_type: 'viewBy',
        view_by: 'airline',
        per_page: 10,
        time_range: { from: 'now-7d', to: 'now' },
        title: 'My swim lane',
      });

      expect(state).toEqual({
        job_ids: ['job-1', 'job-2'],
        swimlane_type: 'viewBy',
        view_by: 'airline',
        per_page: 10,
        time_range: { from: 'now-7d', to: 'now' },
        title: 'My swim lane',
      });
    });

    it('rejects an empty job_ids array', () => {
      expect(() =>
        anomalySwimLaneEmbeddableStateSchema.validate({
          job_ids: [],
          swimlane_type: 'overall',
        })
      ).toThrow();
    });

    it('rejects a view-by swim lane without view_by', () => {
      expect(() =>
        anomalySwimLaneEmbeddableStateSchema.validate({
          job_ids: ['job-1'],
          swimlane_type: 'viewBy',
        })
      ).toThrow();
    });

    it('rejects an unknown swimlane_type', () => {
      expect(() =>
        anomalySwimLaneEmbeddableStateSchema.validate({
          job_ids: ['job-1'],
          swimlane_type: 'somethingElse',
        })
      ).toThrow();
    });
  });

  describe('transformIn', () => {
    it('passes state through with no references', () => {
      const state = {
        job_ids: ['job-1'],
        swimlane_type: 'viewBy' as const,
        view_by: 'airline',
      };
      expect(transformIn(state)).toEqual({ state, references: [] });
    });
  });

  describe('transformOut', () => {
    it('normalizes legacy camelCase stored state to snake_case', () => {
      const legacyStoredState = {
        title: 'Anomalies',
        timeRange: { from: 'now-7d', to: 'now' },
        hidePanelTitles: true,
        jobIds: ['job-1'],
        swimlaneType: 'viewBy',
        viewBy: 'airline',
        perPage: 10,
      } as unknown as AnomalySwimLaneEmbeddableState;

      expect(transformOut(legacyStoredState)).toEqual({
        title: 'Anomalies',
        time_range: { from: 'now-7d', to: 'now' },
        hide_title: true,
        job_ids: ['job-1'],
        swimlane_type: 'viewBy',
        view_by: 'airline',
        per_page: 10,
      });
    });

    it('strips legacy id, query, filters, and refreshConfig fields', () => {
      const legacyStoredState = {
        jobIds: ['job-1'],
        swimlaneType: 'overall',
        id: 'legacy-hash',
        query: { query: 'foo', language: 'kuery' },
        filters: [{ meta: {} }],
        refreshConfig: { pause: true, value: 0 },
      } as unknown as AnomalySwimLaneEmbeddableState;

      expect(transformOut(legacyStoredState)).toEqual({
        job_ids: ['job-1'],
        swimlane_type: 'overall',
      });
    });

    it('returns already-snake_case state unchanged', () => {
      const state: AnomalySwimLaneEmbeddableState = {
        job_ids: ['job-1'],
        swimlane_type: 'viewBy',
        view_by: 'airline',
        per_page: 25,
        time_range: { from: 'now-1h', to: 'now' },
      };
      expect(transformOut(state)).toEqual(state);
    });

    it('throws when stored state is missing job_ids', () => {
      const storedState = {
        swimlaneType: 'overall',
      } as unknown as AnomalySwimLaneEmbeddableState;
      expect(() => transformOut(storedState)).toThrow(
        'Invalid anomaly swim lane embeddable state: missing job_ids'
      );
    });

    it('throws when a view-by swim lane is missing view_by', () => {
      const storedState = {
        jobIds: ['job-1'],
        swimlaneType: 'viewBy',
      } as unknown as AnomalySwimLaneEmbeddableState;
      expect(() => transformOut(storedState)).toThrow(
        'Invalid anomaly swim lane embeddable state: view_by is required for view-by swim lanes'
      );
    });
  });
});
