/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

declare class Events {
  public EVENT_QUEUE_ERROR: 'queue:error';
  public EVENT_JOB_ERROR: 'job:error';
  public EVENT_JOB_CREATED: 'job:created';
  public EVENT_JOB_CREATE_ERROR: 'job:creation error';
  public EVENT_WORKER_COMPLETE: 'worker:job complete';
  public EVENT_WORKER_RESET_PROCESSING_JOB_ERROR: 'worker:reset job processing error';
  public EVENT_WORKER_JOB_CLAIM_ERROR: 'worker:claim job error';
  public EVENT_WORKER_JOB_SEARCH_ERROR: 'worker:pending jobs error';
  public EVENT_WORKER_JOB_UPDATE_ERROR: 'worker:update job error';
  public EVENT_WORKER_JOB_FAIL: 'worker:job failed';
  public EVENT_WORKER_JOB_FAIL_ERROR: 'worker:failed job update error';
  public EVENT_WORKER_JOB_EXECUTION_ERROR: 'worker:job execution error';
  public EVENT_WORKER_JOB_TIMEOUT: 'worker:job timeout';
}

declare const events: Events;

export { events };
