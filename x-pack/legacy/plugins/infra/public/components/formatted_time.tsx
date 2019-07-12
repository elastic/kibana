/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { useMemo } from 'react';

import { useKibanaUiSetting } from '../utils/use_kibana_ui_setting';

const getFormattedTime = (
  time: number,
  userFormat: string | undefined,
  fallbackFormat: string = 'Y-MM-DD HH:mm:ss.SSS'
) => {
  return userFormat ? moment(time).format(userFormat) : moment(time).format(fallbackFormat);
};

export const useFormattedTime = (time: number, fallbackFormat?: string) => {
  const [dateFormat] = useKibanaUiSetting('dateFormat');
  const formattedTime = useMemo(() => getFormattedTime(time, dateFormat, fallbackFormat), [
    getFormattedTime,
    time,
    dateFormat,
    fallbackFormat,
  ]);

  return formattedTime;
};
