/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import type { RRuleParams } from '../../../../common';

// Returns a date in ISO format one year in the future if the rule is recurring or until the end of the MW if it is not recurring.
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
