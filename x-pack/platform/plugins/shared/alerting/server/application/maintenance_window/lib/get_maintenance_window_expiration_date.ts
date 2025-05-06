/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import type { RRuleParams } from '../../../../common';

// Returns the most recent/relevant event and the status for a maintenance window
export const getMaintenanceWindowExpirationDate = ({
  rRule,
  duration,
}: {
  rRule: RRuleParams;
  duration: number;
}): string => {
  let expirationDate;
  if (rRule.interval || rRule.freq) {
    expirationDate = moment().utc().add(1, 'year').toISOString();
  } else {
    expirationDate = moment(rRule.dtstart).utc().add(duration, 'ms').toISOString();
  }

  return expirationDate;
};
