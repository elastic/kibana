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

import dateMath from '@elastic/datemath';
import moment from 'moment';
import { timeUnits } from './time_units';
import { i18n } from '@kbn/i18n';

const TIME_NOW = 'now';

function cantLookup(timeFrom, timeTo, dateFormat) {
  const displayFrom = formatTimeString(timeFrom, dateFormat);
  const displayTo = formatTimeString(timeTo, dateFormat, true);
  return i18n.translate('common.ui.timepicker.fullTimeRange', {
    defaultMessage: '{displayFrom} to {displayTo}',
    values: {
      displayFrom,
      displayTo
    }
  });
}

function formatTimeString(timeString, dateFormat, roundUp = false) {
  if (moment(timeString).isValid()) {
    return moment(timeString).format(dateFormat);
  } else {
    if (timeString === TIME_NOW) {
      return i18n.translate('common.ui.timepicker.timeNow', { defaultMessage: 'now' });
    } else {
      const tryParse = dateMath.parse(timeString, { roundUp: roundUp });
      return moment.isMoment(tryParse) ? '~ ' + tryParse.fromNow() : timeString;
    }
  }
}

function getDateLookupKey(startDate, endDate) {
  return startDate + ' to ' + endDate;
}

export function prettyDuration(timeFrom, timeTo, getConfig) {
  const quickRanges = getConfig('timepicker:quickRanges');
  const dateFormat = getConfig('dateFormat');

  const lookupByRange = {};
  quickRanges.forEach((frame) => {
    lookupByRange[getDateLookupKey(frame.from, frame.to)] = frame;
  });

  // If both parts are date math, try to look up a reasonable string
  if (timeFrom && timeTo && !moment.isMoment(timeFrom) && !moment.isMoment(timeTo)) {
    const tryLookup = lookupByRange[getDateLookupKey(timeFrom, timeTo)];
    if (tryLookup) {
      return tryLookup.display;
    } else {
      const [start, end] = timeFrom.toString().split('-');
      if (timeTo.toString() === TIME_NOW && start === TIME_NOW && end) {
        const [amount, unitId] = end.split('/');
        let text = i18n.translate('common.ui.timepicker.timeUntilNowStr', {
          defaultMessage: 'Last {amount}',
          values: { amount }
        });

        if (unitId) {
          text = text + ' ' + i18n.translate('common.ui.timepicker.roundedTo', {
            defaultMessage: 'rounded to the {unit}',
            values: { unit: timeUnits[unitId] }
          });
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
