/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '@kbn/es-query';
import { apiHasParentApi } from '@kbn/presentation-publishing/interfaces/has_parent_api';
import { apiPublishesTimeRange } from '@kbn/presentation-publishing/interfaces/fetch/publishes_unified_search';

import type { MlEmbeddableBaseApi } from '../embeddables/types';

export const getEmbeddableTimeRange = (embeddable: MlEmbeddableBaseApi): TimeRange | undefined => {
  let timeRange = embeddable.timeRange$?.getValue();

  if (!timeRange && apiHasParentApi(embeddable) && apiPublishesTimeRange(embeddable.parentApi)) {
    timeRange = embeddable.parentApi.timeRange$.getValue();
  }

  return timeRange;
};
