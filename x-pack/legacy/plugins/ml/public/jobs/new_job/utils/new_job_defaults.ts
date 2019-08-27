/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ml, MlDefaults, MlLimits } from '../../../services/ml_api_service';

let defaults = {
  anomaly_detectors: {},
  datafeeds: {},
};
let limits = {};

export async function loadNewJobDefaults(): Promise<{ defaults: MlDefaults; limits: MlLimits }> {
  try {
    const resp = await ml.mlInfo();
    defaults = resp.defaults;
    limits = resp.limits;
    return { defaults, limits };
  } catch (error) {
    return { defaults, limits };
  }
}

export function newJobDefaults() {
  return defaults;
}

export function newJobLimits() {
  return limits;
}
