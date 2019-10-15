/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ml } from '../../../services/ml_api_service';

export interface MlServerDefaults {
  anomaly_detectors: {
    categorization_examples_limit?: number;
    model_memory_limit?: string;
    model_snapshot_retention_days?: number;
  };
  datafeeds: { scroll_size?: number };
}

export interface MlServerLimits {
  max_model_memory_limit?: string;
}

let defaults: MlServerDefaults = {
  anomaly_detectors: {},
  datafeeds: {},
};
let limits: MlServerLimits = {};

export async function loadNewJobDefaults() {
  try {
    const resp = await ml.mlInfo();
    defaults = resp.defaults;
    limits = resp.limits;
    return { defaults, limits };
  } catch (error) {
    return { defaults, limits };
  }
}

export function newJobDefaults(): MlServerDefaults {
  return defaults;
}

export function newJobLimits(): MlServerLimits {
  return limits;
}
