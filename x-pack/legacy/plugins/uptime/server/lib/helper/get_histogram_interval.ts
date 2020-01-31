/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import DateMath from '@elastic/datemath';
import { QUERY } from '../../../common/constants';

export const parseRelativeEndDate = (dateEndStr: string) => {
  // We need this this parsing because if user selects This week or this date
  // That represents end date in future, if week or day is still in the middle
  // Uptime data can never be collected in future, so we will reset end date to now
  // in That case. Example case we select this week range will be to='now/w' and from = 'now/w';
  const dateEnd = DateMath.parse(dateEndStr, { roundUp: true });
  const dateEndTimestamp = dateEnd?.valueOf() ?? 0;
  if (dateEndTimestamp > Date.now()) {
    return DateMath.parse('now');
  }
  return dateEnd;
};

export const getHistogramInterval = (
  dateRangeStart: string,
  dateRangeEnd: string,
  bucketCount?: number
): number => {
  const from = DateMath.parse(dateRangeStart);
  const to = parseRelativeEndDate(dateRangeEnd);
  if (from === undefined) {
    throw Error('Invalid dateRangeStart value');
  }
  if (to === undefined) {
    throw Error('Invalid dateRangeEnd value');
  }
  return Math.round((to.valueOf() - from.valueOf()) / (bucketCount || QUERY.DEFAULT_BUCKET_COUNT));
};
