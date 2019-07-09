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
    modified_date_millis: modifiedDateMillis,
    policy: { name: snapshotName, schedule, repository, config },
    next_execution_millis: nextExecutionMillis,
  } = esPolicy;

  const policy = {
    name,
    version,
    modifiedDateMillis,
    snapshotName,
    schedule,
    repository,
    config: deserializeRestoreSettings(config),
    nextExecutionMillis,
  };

  return policy;
};
