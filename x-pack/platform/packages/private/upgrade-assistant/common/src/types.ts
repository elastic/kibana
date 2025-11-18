/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum ReindexStatus {
  inProgress,
  completed,
  failed,
  paused,
  cancelled,
  // Used by the UI to differentiate if there was a failure retrieving
  // the status from the server API
  fetchFailed,
}
