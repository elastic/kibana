/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Anomalies } from '../types';

export const getSizeFromAnomalies = (anomalies: Anomalies | null): number => {
  if (anomalies == null) {
    return 0;
  } else {
    return anomalies.anomalies.length;
  }
};
