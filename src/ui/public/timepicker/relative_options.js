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

export const relativeOptions = [
  { text: i18n.translate('common.ui.timepicker.relOpts.secondsAgo', { defaultMessage: 'Seconds ago' }), value: 's' },
  { text: i18n.translate('common.ui.timepicker.relOpts.minutesAgo', { defaultMessage: 'Minutes ago' }), value: 'm' },
  { text: i18n.translate('common.ui.timepicker.relOpts.hoursAgo', { defaultMessage: 'Hours ago' }), value: 'h' },
  { text: i18n.translate('common.ui.timepicker.relOpts.daysAgo', { defaultMessage: 'Days ago' }), value: 'd' },
  { text: i18n.translate('common.ui.timepicker.relOpts.weeksAgo', { defaultMessage: 'Weeks ago' }), value: 'w' },
  { text: i18n.translate('common.ui.timepicker.relOpts.monthsAgo', { defaultMessage: 'Months ago' }), value: 'M' },
  { text: i18n.translate('common.ui.timepicker.relOpts.yearsAgo', { defaultMessage: 'Years ago' }), value: 'y' },

  { text: i18n.translate('common.ui.timepicker.relOpts.secondsFromNow', { defaultMessage: 'Seconds from now' }), value: 's+' },
  { text: i18n.translate('common.ui.timepicker.relOpts.minutesFromNow', { defaultMessage: 'Minutes from now' }), value: 'm+' },
  { text: i18n.translate('common.ui.timepicker.relOpts.hoursFromNow', { defaultMessage: 'Hours from now' }), value: 'h+' },
  { text: i18n.translate('common.ui.timepicker.relOpts.daysFromNow', { defaultMessage: 'Days from now' }), value: 'd+' },
  { text: i18n.translate('common.ui.timepicker.relOpts.weeksFromNow', { defaultMessage: 'Weeks from now' }), value: 'w+' },
  { text: i18n.translate('common.ui.timepicker.relOpts.monthsFromNow', { defaultMessage: 'Months from now' }), value: 'M+' },
  { text: i18n.translate('common.ui.timepicker.relOpts.yearsFromNow', { defaultMessage: 'Years from now' }), value: 'y+' },

];
