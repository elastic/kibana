/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Viz IDs that have schema-driven flyout support
const SUPPORTED_VIZ_IDS = new Set([
  'lnsDatatable',
  'lnsXY',
  'lnsHeatmap',
  'lnsPie',
  'lnsMetric',
  'lnsGauge',
  'lnsTagcloud',
]);

export const hasSchemaForVisualization = (vizId: string): boolean => SUPPORTED_VIZ_IDS.has(vizId);
