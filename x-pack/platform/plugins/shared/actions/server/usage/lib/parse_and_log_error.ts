/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';

export function parseAndLogError(err: Error, errType: string, logger: Logger): string {
  const errorMessage = err && err.message ? err.message : err.toString();
  let returnedErrorMessage = errorMessage;

  const errorStr = JSON.stringify(err);
  const logMessage = `Error executing actions telemetry task: ${errType} - ${err}`;
  const logOptions = {
    tags: ['actions', 'telemetry-failed'],
    error: { stack_trace: err.stack },
  };

  // If error string contains "no_shard_available_action_exception", debug log it
  if (errorStr.includes('no_shard_available_action_exception')) {
    // the no_shard_available_action_exception can be wordy and the error message returned from this function
    // gets stored in the task state so lets simplify
    returnedErrorMessage = 'no_shard_available_action_exception';
    if (logger.isLevelEnabled('debug')) {
      logger.debug(logMessage, logOptions);
    }
  } else {
    logger.warn(logMessage, logOptions);
  }

  return returnedErrorMessage;
}
