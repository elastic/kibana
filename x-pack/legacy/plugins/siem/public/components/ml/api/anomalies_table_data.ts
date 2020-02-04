/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npStart } from 'ui/new_platform';
import { Anomalies, InfluencerInput, CriteriaFields } from '../types';
import { throwIfNotOk } from '../../../hooks/api/api';

export interface Body {
  jobIds: string[];
  criteriaFields: CriteriaFields[];
  influencers: InfluencerInput[];
  aggregationInterval: string;
  threshold: number;
  earliestMs: number;
  latestMs: number;
  dateFormatTz: string;
  maxRecords: number;
  maxExamples: number;
}

export const anomaliesTableData = async (body: Body, signal: AbortSignal): Promise<Anomalies> => {
  const response = await npStart.core.http.fetch<Anomalies>(
    '/api/ml/results/anomalies_table_data',
    {
      method: 'POST',
      body: JSON.stringify(body),
      asResponse: true,
      asSystemRequest: true,
      signal,
    }
  );

  await throwIfNotOk(response.response);
  return response.body!;
};
