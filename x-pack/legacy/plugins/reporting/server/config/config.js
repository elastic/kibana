/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cpus } from 'os';

const defaultCPUCount = 2;

function cpuCount() {
  try {
    return cpus().length;
  } catch (e) {
    return defaultCPUCount;
  }
}

export const config = {
  concurrency: cpuCount(),
};
