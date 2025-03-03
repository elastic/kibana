/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import rison from '@kbn/rison';
import type { RefreshInterval, TimeRange } from '@kbn/data-plugin/common/query';
import type { Filter } from '@kbn/es-query';

export const PLUGIN_ID = 'lens';
export const APP_ID = PLUGIN_ID;
export const DOC_TYPE = 'lens';
export const LENS_APP_NAME = APP_ID;
export const LENS_EMBEDDABLE_TYPE = DOC_TYPE;
export const NOT_INTERNATIONALIZED_PRODUCT_NAME = 'Lens Visualizations';
export const BASE_API_URL = '/api/lens';
export const LENS_EDIT_BY_VALUE = 'edit_by_value';
export const LENS_ICON = 'lensApp';
export const STAGE_ID = 'production';

export const INDEX_PATTERN_TYPE = 'index-pattern';

export const PieChartTypes = {
  PIE: 'pie',
  DONUT: 'donut',
  TREEMAP: 'treemap',
  MOSAIC: 'mosaic',
  WAFFLE: 'waffle',
} as const;

export const CategoryDisplay = {
  DEFAULT: 'default',
  INSIDE: 'inside',
  HIDE: 'hide',
} as const;

export const NumberDisplay = {
  HIDDEN: 'hidden',
  PERCENT: 'percent',
  VALUE: 'value',
} as const;

export const LegendDisplay = {
  DEFAULT: 'default',
  SHOW: 'show',
  HIDE: 'hide',
} as const;

// might collide with user-supplied field names, try to make as unique as possible
export const DOCUMENT_FIELD_NAME = '___records___';

export function getBasePath() {
  return `#/`;
}

const GLOBAL_RISON_STATE_PARAM = '_g';

export function getEditPath(
  id: string | undefined,
  timeRange?: TimeRange,
  filters?: Filter[],
  refreshInterval?: RefreshInterval
) {
  const searchArgs: {
    time?: TimeRange;
    filters?: Filter[];
    refreshInterval?: RefreshInterval;
  } = {};

  if (timeRange) {
    searchArgs.time = timeRange;
  }
  if (filters) {
    searchArgs.filters = filters;
  }
  if (refreshInterval) {
    searchArgs.refreshInterval = refreshInterval;
  }

  const searchParam = Object.keys(searchArgs).length
    ? `?${GLOBAL_RISON_STATE_PARAM}=${rison.encode(searchArgs)}`
    : '';

  return id
    ? `#/edit/${encodeURIComponent(id)}${searchParam}`
    : `#/${LENS_EDIT_BY_VALUE}${searchParam}`;
}

export function getFullPath(id?: string) {
  return `/app/${PLUGIN_ID}${id ? getEditPath(id) : getBasePath()}`;
}

export const COLOR_MAPPING_OFF_BY_DEFAULT = false;
