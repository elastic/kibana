/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import dateMath from '@kbn/datemath';
import moment from 'moment';
import { timeUnits } from './time_units';

function cantLookup(timeFrom, timeTo, dateFormat) {
  const displayFrom = formatTimeString(timeFrom, dateFormat);
  const displayTo = formatTimeString(timeTo, dateFormat, true);
  return `${displayFrom} to ${displayTo}`;
}

function formatTimeString(timeString, dateFormat, roundUp = false) {
  if (moment(timeString).isValid()) {
    return moment(timeString).format(dateFormat);
  } else {
    if (timeString === 'now') {
      return 'now';
    } else {
      const tryParse = dateMath.parse(timeString, { roundUp: roundUp });
      return moment.isMoment(tryParse) ? '~ ' + tryParse.fromNow() : timeString;
    }
  }
}

export function prettyDuration(timeFrom, timeTo, getConfig) {
  const quickRanges = getConfig('timepicker:quickRanges');
  const dateFormat = getConfig('dateFormat');

  const lookupByRange = {};
  quickRanges.forEach((frame) => {
    lookupByRange[frame.from + ' to ' + frame.to] = frame;
  });

  // If both parts are date math, try to look up a reasonable string
  if (timeFrom && timeTo && !moment.isMoment(timeFrom) && !moment.isMoment(timeTo)) {
    const tryLookup = lookupByRange[timeFrom.toString() + ' to ' + timeTo.toString()];
    if (tryLookup) {
      return tryLookup.display;
    } else {
      const fromParts = timeFrom.toString().split('-');
      if (timeTo.toString() === 'now' && fromParts[0] === 'now' && fromParts[1]) {
        const rounded = fromParts[1].split('/');
        let text = 'Last ' + rounded[0];
        if (rounded[1]) {
          text = text + ' rounded to the ' + timeUnits[rounded[1]];
        }
        return text;
      } else {
        return cantLookup(timeFrom, timeTo, dateFormat);
      }
    }
  }

  // If at least one part is a moment, try to make pretty strings by parsing date math
  return cantLookup(timeFrom, timeTo, dateFormat);
}
