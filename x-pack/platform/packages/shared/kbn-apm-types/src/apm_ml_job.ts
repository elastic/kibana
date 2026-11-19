/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Environment } from './environment_rt';

/*
Duplicating it here to avoid importing from x-pack/platform/plugins/shared/ml/common/constants/states.ts which causes circular dependencies.
We must extract the ml types to a separate package to avoid this in the future.
*/
enum JOB_STATE {
  CLOSED = 'closed',
  CLOSING = 'closing',
  FAILED = 'failed',
  OPENED = 'opened',
  OPENING = 'opening',
  DELETED = 'deleted',
}

/*
Duplicating it here to avoid importing from x-pack/platform/plugins/shared/ml/common/constants/states.ts which causes circular dependencies.
We must extract the ml types to a separate package to avoid this in the future.
*/
enum DATAFEED_STATE {
  STARTED = 'started',
  STARTING = 'starting',
  STOPPED = 'stopped',
  STOPPING = 'stopping',
  DELETED = 'deleted',
}

export interface ApmMlJob {
  environment: Environment;
  version: number;
  jobId: string;
  jobState?: JOB_STATE;
  datafeedId?: string;
  datafeedState?: DATAFEED_STATE;
  bucketSpan?: string;
}
