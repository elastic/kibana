/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SummaryHistogramPoint } from '../../../common/graphql/types';

export const seriesHasDownValues = (series: SummaryHistogramPoint[] | null): boolean => {
  return series ? series.some(point => !!point.down) : false;
};
