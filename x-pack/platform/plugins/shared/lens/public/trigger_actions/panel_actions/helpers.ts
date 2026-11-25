/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiHasParentApi, apiPublishesTimeRange } from '@kbn/presentation-publishing';
import type { TimeRange } from '@kbn/es-query';

/** The panel time range, falling back to the one of the renderer hosting the embeddable. */
export const getEffectiveTimeRange = (embeddable: unknown): TimeRange | undefined => {
  if (apiPublishesTimeRange(embeddable)) {
    const panelTimeRange = embeddable.timeRange$.getValue();
    if (panelTimeRange) return panelTimeRange;
  }
  return apiHasParentApi(embeddable) && apiPublishesTimeRange(embeddable.parentApi)
    ? embeddable.parentApi.timeRange$.getValue()
    : undefined;
};

/** The embeddable of the context an action is run with, if any. */
export const getContextEmbeddable = (context: object): unknown =>
  'embeddable' in context ? context.embeddable : undefined;
