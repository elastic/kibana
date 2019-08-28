/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ml, MlDefaults, MlLimits } from '../../../../../services/ml_api_service';

let defaults: MlDefaults = {
  anomaly_detectors: {},
  datafeeds: {},
};
let limits: MlLimits = {};

export async function loadNewJobDefaults(): Promise<{ defaults: MlDefaults; limits: MlLimits }> {
  try {
    const { defaults: newDefaults, limits: newLimits } = await ml.mlInfo();
    defaults = newDefaults;
    limits = newLimits;
    return { defaults, limits };
  } catch (error) {
    return { defaults, limits };
  }
}

export function newJobDefaults(): MlDefaults {
  return defaults;
}

export function newJobLimits(): MlLimits {
  return limits;
}
