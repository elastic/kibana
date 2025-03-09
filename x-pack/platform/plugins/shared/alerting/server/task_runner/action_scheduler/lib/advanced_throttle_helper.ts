/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AdvancedThrottle } from '@kbn/alerting-types';
import { Logger } from '@kbn/logging';
import { RRule } from '@kbn/rrule';
import moment from 'moment';

export const isAdvancedThrottled = ({
  advancedThrottle,
  date,
  throttleMills,
  logger,
}: {
  advancedThrottle?: AdvancedThrottle;
  date: Date;
  throttleMills: number;
  logger: Logger;
}): boolean => {
  if (advancedThrottle) {
    try {
      const rrule = new RRule({
        ...advancedThrottle,
        dtstart: moment(date).subtract(1, 'ms').toDate(),
      });
      const nextRun = rrule.after(date);
      return nextRun ? nextRun?.getTime() > Date.now() : false;
    } catch (e) {
      logger.error(`Next run time of the action couln't be calculated. error: `, e);
      return false;
    }
  } else {
    return date.getTime() + throttleMills > Date.now();
  }
};
