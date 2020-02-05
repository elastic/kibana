/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npStart } from 'ui/new_platform';

import { InfluencerInput, MlCapabilities } from '../types';
import { throwIfNotOk } from '../../../hooks/api/api';

export interface Body {
  jobIds: string[];
  criteriaFields: string[];
  influencers: InfluencerInput[];
  aggregationInterval: string;
  threshold: number;
  earliestMs: number;
  latestMs: number;
  dateFormatTz: string;
  maxRecords: number;
  maxExamples: number;
}

export const getMlCapabilities = async (signal: AbortSignal): Promise<MlCapabilities> => {
  const response = await npStart.core.http.fetch<MlCapabilities>('/api/ml/ml_capabilities', {
    method: 'GET',
    asResponse: true,
    asSystemRequest: true,
    signal,
  });

  await throwIfNotOk(response.response);
  return response.body!;
};
