/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

export type TransformRequest = estypes.TransformPutTransformRequest & {
  dest: { index: string };
  description: string;
};
export type PivotTransformRequest = TransformRequest & { pivot: estypes.TransformPivot };
export type LatestTransformRequest = TransformRequest & { latest: estypes.TransformLatest };

export const getPivotTransformConfig = (
  prefix: string,
  continuous?: boolean,
  unattended?: boolean
): PivotTransformRequest => {
  const transformId = `ec_${prefix}_pivot_${Date.now()}_${continuous ? 'cont' : 'batch'}${
    unattended ? '_unattended' : ''
  }`;
  return {
    transform_id: transformId,
    source: { index: ['ft_ecommerce'] },
    pivot: {
      group_by: { category: { terms: { field: 'category.keyword' } } },
      aggregations: { 'products.base_price.avg': { avg: { field: 'products.base_price' } } },
    },
    description: `ecommerce ${
      continuous ? 'continuous' : 'batch'
    } transform with avg(products.base_price) grouped by terms(category.keyword)`,
    dest: { index: `user-${transformId}` },
    ...(continuous ? { sync: { time: { field: 'order_date', delay: '60s' } } } : {}),
    ...(unattended ? { settings: { unattended: true } } : {}),
  };
};

export const getLatestTransformConfig = (
  prefix: string,
  continuous?: boolean
): LatestTransformRequest => {
  const transformId = `ec_${prefix}_latest_${Date.now()}_${continuous ? 'cont' : 'batch'}`;
  return {
    transform_id: transformId,
    source: { index: ['ft_ecommerce'] },
    latest: {
      unique_key: ['category.keyword'],
      sort: 'order_date',
    },
    description: `ecommerce ${
      continuous ? 'continuous' : 'batch'
    } transform with category unique key and sorted by order date`,
    frequency: '3s',
    settings: {
      max_page_search_size: 250,
    },
    dest: { index: `user-${transformId}` },
    ...(continuous ? { sync: { time: { field: 'order_date', delay: '60s' } } } : {}),
  };
};
