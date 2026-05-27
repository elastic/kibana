/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { APMIndices } from '@kbn/apm-types';
import { defineRoute } from '../types';

export interface DataViewIndexPatternResponse {
  apmDataViewIndexPattern: string;
  apmIndices: APMIndices;
}

export const dataViewIndexPatternRoute = defineRoute<DataViewIndexPatternResponse>()({
  endpoint: 'GET /internal/apm/data_view/index_pattern',
});
