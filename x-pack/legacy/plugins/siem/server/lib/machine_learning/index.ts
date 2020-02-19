/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

type MlService = any;

export interface Params {
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

export const anomaliesTableData = async (params: Params): Promise<Anomalies> => {
  const response = await MlService.get().fetch<Anomalies>('/api/ml/results/anomalies_table_data', {
    method: 'POST',
    body: JSON.stringify(body),
    asSystemRequest: true,
  });

  return response;
};

export const getAnomaliesTableData = () => {};
