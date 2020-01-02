/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment-timezone';

import { DEFAULT_DATE_FORMAT, DEFAULT_DATE_FORMAT_TZ } from '../../common/constants';
import { useUiSetting } from '../lib/kibana';

export const useDateFormat = () => useUiSetting<string>(DEFAULT_DATE_FORMAT);

export const useTimeZone = () => {
  const timeZone = useUiSetting<string>(DEFAULT_DATE_FORMAT_TZ);
  return timeZone === 'Browser' ? moment.tz.guess() : timeZone;
};
