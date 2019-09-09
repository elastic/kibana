/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface Metric {
  app: string;
  description: string;
  field: string;
  format: string;
  hasCalculation?: boolean;
  isDerivative?: boolean;
  label: string;
  metricAgg: string;
  title: string;
  units: string;
}

export interface Series {
  bucket_size: string;
  timeRange: {
    min: number;
    max: number;
  };
  metric: Metric;
  data: Array<[number, number]>;
}

export type FormatMethod = (val: number) => string;
