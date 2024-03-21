/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CASES_ATTACHMENT_CHANGE_POINT_CHART = 'aiopsChangePointChart';

export const EMBEDDABLE_CHANGE_POINT_CHART_TYPE = 'aiopsChangePointChart' as const;

export type EmbeddableChangePointType = typeof EMBEDDABLE_CHANGE_POINT_CHART_TYPE;

export const CHANGE_POINT_DETECTION_VIEW_TYPE = {
  CHARTS: 'charts',
  TABLE: 'table',
} as const;

export type ChangePointDetectionViewType =
  typeof CHANGE_POINT_DETECTION_VIEW_TYPE[keyof typeof CHANGE_POINT_DETECTION_VIEW_TYPE];
