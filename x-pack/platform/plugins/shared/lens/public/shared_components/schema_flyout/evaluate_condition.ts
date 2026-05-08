/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldDescriptor, FieldVisibilityCondition } from './types';

interface ConditionContext {
  /** Series types from all data layers */
  seriesTypes: string[];
  /** Whether the X axis is time-based */
  hasTimeAxis: boolean;
  /** Whether any layer uses a text-based (ES|QL) datasource */
  hasTextBasedDatasource: boolean;
}

/**
 * Extract condition context from visualization state.
 * Works for XY charts; other viz types return a permissive context.
 */
export const extractConditionContext = (state: unknown): ConditionContext => {
  const defaultContext: ConditionContext = {
    seriesTypes: [],
    hasTimeAxis: false,
    hasTextBasedDatasource: false,
  };

  if (state == null || typeof state !== 'object') return defaultContext;

  const s = state as Record<string, unknown>;
  const layers = s.layers;
  if (!Array.isArray(layers)) return defaultContext;

  const seriesTypes: string[] = [];
  let hasTextBasedDatasource = false;

  for (const layer of layers) {
    if (layer == null || typeof layer !== 'object') continue;
    const l = layer as Record<string, unknown>;

    // Collect series types from data layers
    if (typeof l.seriesType === 'string') {
      seriesTypes.push(l.seriesType);
    }

    // Check for text-based datasource
    if (l.layerType === 'data' || !l.layerType) {
      if (typeof l.datasourceId === 'string' && l.datasourceId === 'textBased') {
        hasTextBasedDatasource = true;
      }
    }
  }

  // Check for time axis — look at the visualization state's xAccessor config
  // The presence of a date histogram is indicated by the axis scale type
  const hasTimeAxis =
    typeof s.xAxisScaleType === 'string' && s.xAxisScaleType === 'time' ? true : false;

  return { seriesTypes, hasTimeAxis, hasTextBasedDatasource };
};

/**
 * Evaluate whether a field's condition is met given the current context.
 * Returns true if the field should be visible.
 */
export const evaluateCondition = (
  condition: FieldVisibilityCondition | undefined,
  context: ConditionContext
): boolean => {
  if (!condition) return true;

  if (condition.seriesTypes && condition.seriesTypes.length > 0) {
    const hasMatch = context.seriesTypes.some((st) => condition.seriesTypes!.includes(st));
    if (!hasMatch) return false;
  }

  if (condition.requiresTimeAxis && !context.hasTimeAxis) {
    return false;
  }

  if (condition.excludeTextBased && context.hasTextBasedDatasource) {
    return false;
  }

  return true;
};

/**
 * Filter field descriptors, removing those whose conditions aren't met.
 */
export const filterFieldsByCondition = (
  fields: FieldDescriptor[],
  state: unknown
): FieldDescriptor[] => {
  const context = extractConditionContext(state);
  return fields.filter((field) => evaluateCondition(field.condition, context));
};
