/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import 'moment-duration-format';
import {
  FORMAT_DURATION_TEMPLATE_TINY,
  FORMAT_DURATION_TEMPLATE_SHORT,
  FORMAT_DURATION_TEMPLATE_LONG,
  CALCULATE_DURATION_SINCE,
  CALCULATE_DURATION_UNTIL,
} from './constants';

/*
 * Formats a timestamp string
 * @param timestamp: ISO time string
 * @param calculationFlag: control "since" or "until" logic
 * @param initialTime {Object} moment object (not required)
 * @return string
 */
export function formatTimestampToDuration(timestamp, calculationFlag, initialTime) {
  initialTime = initialTime || moment();
  let timeDuration;
  if (calculationFlag === CALCULATE_DURATION_SINCE) {
    timeDuration = moment.duration(initialTime - moment(timestamp)); // since: now - timestamp
  } else if (calculationFlag === CALCULATE_DURATION_UNTIL) {
    timeDuration = moment.duration(moment(timestamp) - initialTime); // until: timestamp - now
  } else {
    throw new Error(
      '[formatTimestampToDuration] requires a [calculationFlag] parameter to specify format as "since" or "until" the given time.'
    );
  }

  // See https://github.com/elastic/x-pack-kibana/issues/3554
  let duration;
  if (Math.abs(initialTime.diff(timestamp, 'months')) >= 1) {
    // time diff is greater than 1 month, show months / days
    duration = moment.duration(timeDuration).format(FORMAT_DURATION_TEMPLATE_LONG);
  } else if (Math.abs(initialTime.diff(timestamp, 'minutes')) >= 1) {
    // time diff is less than 1 month but greater than a minute, show days / hours / minutes
    duration = moment.duration(timeDuration).format(FORMAT_DURATION_TEMPLATE_SHORT);
  } else {
    // time diff is less than a minute, show seconds
    duration = moment.duration(timeDuration).format(FORMAT_DURATION_TEMPLATE_TINY);
  }

  return duration
    .replace(/ 0 min$/, '')
    .replace(/ 0 hrs$/, '')
    .replace(/ 0 days$/, ''); // See https://github.com/jsmreese/moment-duration-format/issues/64
}
