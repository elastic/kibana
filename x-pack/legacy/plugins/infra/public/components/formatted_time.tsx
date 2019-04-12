/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import React, { useMemo } from 'react';

import { useKibanaUiSetting } from '../utils/use_kibana_ui_setting';

interface FormattedTimeProps {
  time: number; // Unix time (milliseconds)
  fallbackFormat?: string;
}

const getFormattedTime = (
  time: FormattedTimeProps['time'],
  userFormat: string | undefined,
  fallbackFormat: string = 'Y-MM-DD HH:mm:ss.SSS'
) => {
  return userFormat ? moment(time).format(userFormat) : moment(time).format(fallbackFormat);
};

export const FormattedTime: React.FunctionComponent<FormattedTimeProps> = ({
  time,
  fallbackFormat,
}) => {
  const [dateFormat] = useKibanaUiSetting('dateFormat');
  const formattedTime = useMemo(() => getFormattedTime(time, dateFormat, fallbackFormat), [
    getFormattedTime,
    time,
    dateFormat,
    fallbackFormat,
  ]);

  return <span>{formattedTime}</span>;
};
