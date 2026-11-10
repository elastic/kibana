/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricVisualizationState } from '@kbn/lens-common';
import { isRecord } from '../../../types_guards';

export function isMetricVisualizationState(state: unknown): state is MetricVisualizationState {
  return isRecord(state) && typeof state.layerId === 'string';
}
