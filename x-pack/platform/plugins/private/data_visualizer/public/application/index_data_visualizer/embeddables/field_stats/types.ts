/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { AggregateQuery } from '@kbn/es-query';
import type {
  HasEditCapabilities,
  PublishesBlockingError,
  PublishesDataLoading,
  PublishesDataViews,
  PublishesTimeRange,
} from '@kbn/presentation-publishing';
import type { BehaviorSubject } from 'rxjs';
import type {
  FieldStatisticsTableEmbeddableState,
  FieldStatsInitializerViewType,
  FieldStatsInitialState,
} from '../grid_embeddable/types';

export interface FieldStatsControlsApi {
  viewType$: BehaviorSubject<FieldStatsInitializerViewType>;
  dataViewId$: BehaviorSubject<string>;
  query$: BehaviorSubject<AggregateQuery>;
  showDistributions$: BehaviorSubject<boolean>;
  updateUserInput: (update: Partial<FieldStatsInitialState>) => void;
}

export type FieldStatisticsTableEmbeddableApi =
  DefaultEmbeddableApi<FieldStatisticsTableEmbeddableState> &
    HasEditCapabilities &
    PublishesDataViews &
    PublishesTimeRange &
    PublishesDataLoading &
    PublishesBlockingError &
    FieldStatsControlsApi;
