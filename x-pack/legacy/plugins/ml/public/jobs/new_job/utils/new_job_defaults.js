/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ml } from 'plugins/ml/services/ml_api_service';

let defaults = {
  anomaly_detectors: {},
  datafeeds: {}
};
let limits = {};

export function loadNewJobDefaults() {
  return new Promise((resolve) => {
    ml.mlInfo()
      .then((resp) => {
        defaults = resp.defaults;
        limits = resp.limits;
        resolve({ defaults, limits });
      })
      .catch(() => {
        resolve({ defaults, limits });
      });
  });
}

export function newJobDefaults() {
  return defaults;
}

export function newJobLimits() {
  return limits;
}

