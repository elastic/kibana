/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnomalySwimLaneEmbeddableState } from '@kbn/ml-server-schemas/embeddables/anomaly_swimlane';

// Pre 9.5 stored state used camelCase for these fields; older state may also
// carry id/query/filters/refreshConfig — the factory's serializeState never wrote
// them, but they were exposed in the previous schema and may exist in cases
// attachments or migrated dashboards.
export interface LegacyAnomalySwimLaneFields {
  jobIds?: AnomalySwimLaneEmbeddableState['job_ids'];
  swimlaneType?: AnomalySwimLaneEmbeddableState['swimlane_type'];
  viewBy?: string;
  perPage?: number;
  id?: unknown;
  query?: unknown;
  filters?: unknown;
  refreshConfig?: unknown;
}

type AnomalySwimLaneViewByState = Extract<
  AnomalySwimLaneEmbeddableState,
  { swimlane_type: 'viewBy' }
>;

// `view_by` only exists on the view-by branch, but legacy normalization needs
// to read it before `swimlane_type` has narrowed the state to that branch.
type PartialAnomalySwimLaneState = Partial<
  AnomalySwimLaneEmbeddableState & Pick<AnomalySwimLaneViewByState, 'view_by'>
>;

export type RawAnomalySwimLaneState = PartialAnomalySwimLaneState & LegacyAnomalySwimLaneFields;

export type NormalizedAnomalySwimLaneFields =
  | {
      swimlane_type: 'overall';
      job_ids: string[];
      per_page?: number;
    }
  | {
      swimlane_type: 'viewBy';
      job_ids: string[];
      view_by: string;
      per_page?: number;
    };

export const normalizeAnomalySwimLaneLegacyFields = (
  state: RawAnomalySwimLaneState
): NormalizedAnomalySwimLaneFields => {
  const jobIds = state.job_ids ?? state.jobIds;
  const swimlaneType = state.swimlane_type ?? state.swimlaneType;
  const viewBy = state.view_by ?? state.viewBy;
  const perPage = state.per_page ?? state.perPage;

  if (!jobIds || jobIds.length === 0) {
    throw new Error('Invalid anomaly swim lane embeddable state: missing job_ids');
  }
  if (!swimlaneType) {
    throw new Error('Invalid anomaly swim lane embeddable state: missing swimlane_type');
  }

  const pagination = perPage !== undefined ? { per_page: perPage } : {};

  if (swimlaneType === 'viewBy') {
    if (!viewBy) {
      throw new Error(
        'Invalid anomaly swim lane embeddable state: view_by is required for view-by swim lanes'
      );
    }
    return {
      swimlane_type: 'viewBy',
      job_ids: jobIds,
      view_by: viewBy,
      ...pagination,
    };
  }

  return {
    swimlane_type: 'overall',
    job_ids: jobIds,
    ...pagination,
  };
};
