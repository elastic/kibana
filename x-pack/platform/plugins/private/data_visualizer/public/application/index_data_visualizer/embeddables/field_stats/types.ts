/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type {
  CanCancelRequests,
  HasEditCapabilities,
  PublishesBlockingError,
  PublishesDataLoading,
  PublishesDataSources,
  PublishesTimeRange,
} from '@kbn/presentation-publishing';
import type { BehaviorSubject } from 'rxjs';
import type { FieldStatsTableEmbeddableState } from '@kbn/data-visualizer-server-schemas/embeddables/field_stats';
import type { FieldStatsInitialState } from '../../../../../common/embeddables/types';

export interface FieldStatsControlsApi {
  viewType$: BehaviorSubject<NonNullable<FieldStatsInitialState['view_type']>>;
  dataViewId$: BehaviorSubject<string | undefined>;
  query$: BehaviorSubject<FieldStatsInitialState['query']>;
  showDistributions$: BehaviorSubject<boolean>;
  updateUserInput: (update: FieldStatsInitialState) => void;
}

export type FieldStatisticsTableEmbeddableApi =
  DefaultEmbeddableApi<FieldStatsTableEmbeddableState> &
    CanCancelRequests &
    HasEditCapabilities &
    PublishesDataSources<DataView> &
    PublishesTimeRange &
    PublishesDataLoading &
    PublishesBlockingError &
    FieldStatsControlsApi;
