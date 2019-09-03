/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Anomaly } from '../types';

export const createExplorerLink = (score: Anomaly, startDate: number, endDate: number): string => {
  const startDateIso = new Date(startDate).toISOString();
  const endDateIso = new Date(endDate).toISOString();

  const JOB_PREFIX = `ml#/explorer?_g=(ml:(jobIds:!(${score.jobId}))`;
  const REFRESH_INTERVAL = `,refreshInterval:(display:Off,pause:!f,value:0),time:(from:'${startDateIso}',mode:absolute,to:'${endDateIso}'))`;
  const INTERVAL_SELECTION = `&_a=(mlExplorerFilter:(),mlExplorerSwimlane:(),mlSelectLimit:(display:'10',val:10),mlShowCharts:!t)`;

  return `${JOB_PREFIX}${REFRESH_INTERVAL}${INTERVAL_SELECTION}`;
};
