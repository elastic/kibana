/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { deserializeRestoreSettings } from '../../common/lib';
import { SlmPolicy, SlmPolicyEs } from '../../common/types';

export const deserializePolicy = (name: string, esPolicy: SlmPolicyEs): SlmPolicy => {
  const {
    version,
    modified_date: modifiedDate,
    modified_date_millis: modifiedDateMillis,
    policy: { name: snapshotName, schedule, repository, config },
    next_execution: nextExecution,
    next_execution_millis: nextExecutionMillis,
    last_failure: lastFailure,
    last_success: lastSuccess,
  } = esPolicy;

  const policy: SlmPolicy = {
    name,
    version,
    modifiedDate,
    modifiedDateMillis,
    snapshotName,
    schedule,
    repository,
    config: deserializeRestoreSettings(config),
    nextExecution,
    nextExecutionMillis,
  };

  if (lastFailure) {
    const {
      snapshot_name: failureSnapshotName,
      time: failureTime,
      time_string: failureTimeString,
      details: failureDetails,
    } = lastFailure;

    let jsonFailureDetails;

    try {
      jsonFailureDetails = JSON.parse(failureDetails);
    } catch (e) {
      // silently swallow json parsing error
      // we don't expect ES to return unparsable json
    }

    policy.lastFailure = {
      snapshotName: failureSnapshotName,
      time: failureTime,
      timeString: failureTimeString,
      details: jsonFailureDetails || failureDetails,
    };
  }

  if (lastSuccess) {
    const {
      snapshot_name: successSnapshotName,
      time: successTime,
      time_string: successTimeString,
    } = lastSuccess;

    policy.lastSuccess = {
      snapshotName: successSnapshotName,
      time: successTime,
      timeString: successTimeString,
    };
  }

  return policy;
};
