/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackagePolicyConfigRecord } from '../../../../../integrations/types';
import { DURATION_APM_SETTINGS_VARS } from '../../../../constants';

// Fix duration vars, if it's a migrated setting, and it's a plain old number with no suffix, we should assume seconds
export function fixApmDurationVars(vars: PackagePolicyConfigRecord) {
  const { IDLE_TIMEOUT, READ_TIMEOUT, SHUTDOWN_TIMEOUT, TAIL_SAMPLING_INTERVAL, WRITE_TIMEOUT } =
    DURATION_APM_SETTINGS_VARS;
  // convert vars to array, map each key/value pair into another pair
  // and then fromEntries gives back the object
  return Object.fromEntries(
    Object.entries(vars).map((entry: any) => {
      if (
        entry[0] === IDLE_TIMEOUT ||
        entry[0] === READ_TIMEOUT ||
        entry[0] === SHUTDOWN_TIMEOUT ||
        entry[0] === TAIL_SAMPLING_INTERVAL ||
        entry[0] === WRITE_TIMEOUT
      ) {
        // we add the unit seconds sufix as default
        if (/[0-9]+$/.test(entry[1].value)) {
          entry[1] = { ...entry[1], value: entry[1].value + 's' };
          return [entry[0], entry[1]];
        }
      }
      return entry;
    })
  );
}
