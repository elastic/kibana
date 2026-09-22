/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformTimeRangeOut, transformTitlesOut } from '@kbn/presentation-publishing';
import type { AnomalySwimLaneEmbeddableState } from '@kbn/ml-server-schemas/embeddables/anomaly_swimlane';
import { flow } from 'lodash';
import {
  normalizeAnomalySwimLaneLegacyFields,
  type RawAnomalySwimLaneState,
} from './normalize_legacy_state';

export function transformOut(
  storedState: AnomalySwimLaneEmbeddableState
): AnomalySwimLaneEmbeddableState {
  const transformsFlow = flow(
    transformTitlesOut<AnomalySwimLaneEmbeddableState>,
    transformTimeRangeOut<AnomalySwimLaneEmbeddableState>
  );
  const state = transformsFlow(storedState) as RawAnomalySwimLaneState;

  const normalized = normalizeAnomalySwimLaneLegacyFields(state);

  const {
    jobIds: _jobIds,
    swimlaneType: _swimlaneType,
    viewBy: _viewBy,
    perPage: _perPage,
    id: _id,
    query: _query,
    filters: _filters,
    refreshConfig: _refreshConfig,
    ...passthrough
  } = state;

  return {
    ...passthrough,
    ...normalized,
  };
}
