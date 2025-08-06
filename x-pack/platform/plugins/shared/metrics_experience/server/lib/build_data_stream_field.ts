/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type FieldCapsFieldCapability } from '@elastic/elasticsearch/lib/api/types';
import { Dimension, type MetricField } from '../types';

export function buildMetricField(
  name: string,
  index: string,
  dimensions: Array<Dimension>,
  type: string,
  typeInfo: FieldCapsFieldCapability
): MetricField {
  const unit = Array.isArray(typeInfo.meta?.unit)
    ? typeInfo.meta.unit.join(', ')
    : typeInfo.meta?.unit;

  const description = Array.isArray(typeInfo.meta?.description)
    ? typeInfo.meta.description.join(', ')
    : typeInfo.meta?.description;

  const display = Array.isArray(typeInfo.meta?.display)
    ? typeInfo.meta.display.join(', ')
    : typeInfo.meta?.display;

  return {
    name,
    index,
    dimensions,
    type,
    time_series_metric: typeInfo.time_series_metric,
    unit,
    description,
    display,
  };
}
