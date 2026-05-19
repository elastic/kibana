/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricVisualizationState } from '@kbn/lens-common';

export type MetricVisualizationStateWithLegacyTitleWeight = MetricVisualizationState & {
  titleWeight?: unknown;
};

/**
 * Strips the deprecated `titleWeight` property that was removed from the
 * MetricVisualizationState type.
 */
export const removeLegacyTitleWeight = (
  state: MetricVisualizationStateWithLegacyTitleWeight
): MetricVisualizationState => {
  if (!('titleWeight' in state)) return state;
  const { titleWeight: _titleWeight, ...updatedState } = state;
  return updatedState;
};
