/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { trackRuntimeMigration } from '../../../runtime_state';
import type { MetricVisualizationState } from '../types';

export const convertToRunTimeState = (
  state: MetricVisualizationState
): MetricVisualizationState => {
  // Remove legacy state properties if they exist
  const { secondaryPrefix, valuesTextAlign, ...restState } = state;
  let newState = { ...restState };
  let wasMigrated = false;

  if (valuesTextAlign) {
    wasMigrated = true;
    newState = {
      ...newState,
      primaryAlign: state.primaryAlign ?? valuesTextAlign,
      secondaryAlign: state.secondaryAlign ?? valuesTextAlign,
    };
  }

  if (secondaryPrefix && !newState.secondaryLabel) {
    wasMigrated = true;
    newState = {
      ...newState,
      secondaryLabel: secondaryPrefix,
    };
  }

  if (wasMigrated) {
    trackRuntimeMigration('metric');
  }

  return newState;
};
