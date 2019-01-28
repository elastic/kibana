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

import { i18n } from '@kbn/i18n';

const MS_IN_SECOND = 1000;
const MS_IN_MINUTE = 60 * MS_IN_SECOND;
const MS_IN_HOUR = 60 * MS_IN_MINUTE;
const MS_IN_DAY = 24 * MS_IN_HOUR;

export function prettyInterval(intervalInMs) {
  let interval;
  let units;
  if (intervalInMs === 0) {
    return i18n.translate('common.ui.timepicker.off', { defaultMessage: 'Off' });
  } else if (intervalInMs < MS_IN_MINUTE) {
    interval = Math.round(intervalInMs / MS_IN_SECOND);
    units = (interval > 1 ?
      (i18n.translate('common.ui.timepicker.seconds', { defaultMessage: 'seconds' })) :
      (i18n.translate('common.ui.timepicker.second', { defaultMessage: 'second' })));
  } else if (intervalInMs < MS_IN_HOUR) {
    interval = Math.round(intervalInMs / MS_IN_MINUTE);
    units = (interval > 1 ?
      (i18n.translate('common.ui.timepicker.minutes', { defaultMessage: 'minutes' })) :
      (i18n.translate('common.ui.timepicker.minute', { defaultMessage: 'minute' })));
  } else if (intervalInMs < MS_IN_DAY) {
    interval = Math.round(intervalInMs / MS_IN_HOUR);
    units = (interval > 1 ?
      (i18n.translate('common.ui.timepicker.hours', { defaultMessage: 'hours' })) :
      (i18n.translate('common.ui.timepicker.hour', { defaultMessage: 'hour' })));
  } else {
    interval = Math.round(intervalInMs / MS_IN_DAY);
    units = (interval > 1 ?
      (i18n.translate('common.ui.timepicker.days', { defaultMessage: 'days' })) :
      (i18n.translate('common.ui.timepicker.day', { defaultMessage: 'day' })));
  }

  return `${interval} ${units}`;
}
