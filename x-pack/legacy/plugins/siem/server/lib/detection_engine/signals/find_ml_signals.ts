/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import dateMath from '@elastic/datemath';

import { AlertServices } from '../../../../../../../plugins/alerting/server';

import { getAnomalies } from '../../machine_learning';

export const findMlSignals = async (
  jobId: string,
  anomalyThreshold: number,
  from: string,
  to: string,
  callCluster: AlertServices['callCluster']
) => {
  const params = {
    jobIds: [jobId],
    threshold: anomalyThreshold,
    earliestMs: dateMath.parse(from)?.valueOf() ?? 0,
    latestMs: dateMath.parse(to)?.valueOf() ?? 0,
  };
  const relevantAnomalies = await getAnomalies(params, callCluster);

  return relevantAnomalies;
};
