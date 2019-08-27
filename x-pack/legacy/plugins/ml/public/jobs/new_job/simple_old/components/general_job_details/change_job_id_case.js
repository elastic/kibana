/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


// force job ids to be lowercase
export function changeJobIDCase(config) {
  if (config.jobId) {
    config.jobId = config.jobId.toLowerCase();
  }
}
