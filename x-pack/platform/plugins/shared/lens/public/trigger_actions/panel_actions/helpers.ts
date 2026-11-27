/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiHasParentApi, apiPublishesTimeRange } from '@kbn/presentation-publishing';
import type { TimeRange } from '@kbn/es-query';
import type { LensSerializedState } from '@kbn/lens-common';
import type { LensApi } from '@kbn/lens-common-2';

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

/**
 * The state of the chart to hand over to another app: its current state and time range,
 * with `title` replacing the chart one when it is given (the embedded chart may hide it).
 */
export const getChartInput = (embeddable: LensApi, title?: string): LensSerializedState => {
  const state = embeddable.getLegacySerializedState();
  return {
    ...state,
    ...(title !== undefined && 'attributes' in state && state.attributes
      ? { attributes: { ...state.attributes, title } }
      : {}),
    time_range: getEffectiveTimeRange(embeddable),
  };
};
