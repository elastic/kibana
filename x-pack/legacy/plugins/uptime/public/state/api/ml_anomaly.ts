/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fetchGet } from './utils';

export const fetchMLJob = async () => {
  const url = '/api/ml/anomaly_detectors/uptime-duration-chart';

  return fetchGet(url);
};
