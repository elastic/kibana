/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricVisualizationState } from '../types';

/**
 * Checks if the given MetricVisualizationState contains any legacy properties
 * that require migration to the latest state shape.
 */
const hasLegacyStateProperties = (state: MetricVisualizationState) => {
  return (
    typeof state.secondaryPrefix !== 'undefined' || typeof state.valuesTextAlign !== 'undefined'
  );
};

export const convertToRunTimeState = (state: MetricVisualizationState) => {
  if (hasLegacyStateProperties(state)) {
    // Remove legacy properties from the state
    const { secondaryPrefix, valuesTextAlign, ...restState } = state;

    return {
      ...restState,
      secondaryLabel:
        secondaryPrefix && !state.secondaryLabel ? secondaryPrefix : state.secondaryLabel,
      primaryAlign: state.primaryAlign ?? valuesTextAlign,
      secondaryAlign: state.secondaryAlign ?? valuesTextAlign,
    };
  }
  return state;
};
