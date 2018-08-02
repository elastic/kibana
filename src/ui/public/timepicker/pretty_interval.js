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

const MS_IN_SECOND = 1000;
const MS_IN_MINUTE = 60 * MS_IN_SECOND;
const MS_IN_HOUR = 60 * MS_IN_MINUTE;
const MS_IN_DAY = 24 * MS_IN_HOUR;

export function prettyInterval(intervalInMs) {
  if (intervalInMs === 0) {
    return 'Off';
  } else if (intervalInMs < MS_IN_MINUTE) {
    const intervalInSeconds = Math.round(intervalInMs / MS_IN_SECOND);
    const units = intervalInSeconds > 1 ? 'seconds' : 'second';
    return `${intervalInSeconds} ${units}`;
  } else if (intervalInMs < MS_IN_HOUR) {
    const intervalInMinutes = Math.round(intervalInMs / MS_IN_MINUTE);
    const units = intervalInMinutes > 1 ? 'minutes' : 'minute';
    return `${intervalInMinutes} ${units}`;
  } else if (intervalInMs < MS_IN_DAY) {
    const intervalInHours = Math.round(intervalInMs / MS_IN_HOUR);
    const units = intervalInHours > 1 ? 'hours' : 'hour';
    return `${intervalInHours} ${units}`;
  }

  const intervalInDays = Math.round(intervalInMs / MS_IN_DAY);
  const units = intervalInDays > 1 ? 'days' : 'day';
  return `${intervalInDays} ${units}`;
}
