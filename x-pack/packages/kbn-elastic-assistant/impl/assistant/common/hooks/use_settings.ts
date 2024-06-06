/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { useAssistantContext } from '../../../assistant_context';

export const DEFAULT_DATE_FORMAT_TZ = 'dateFormat:tz' as const;
export const DEFAULT_DATE_FORMAT = 'dateFormat' as const;

export const useUiSetting = <T>(key: string, defaultValue?: T): T => {
  const { settings } = useAssistantContext();

  if (!settings) {
    throw new TypeError('uiSettings service not available in kibana-react context.');
  }

  return settings.client.get(key, defaultValue);
};

export const useDateFormat = (): string => useUiSetting<string>(DEFAULT_DATE_FORMAT);

export const useTimeZone = (): string => {
  const timeZone = useUiSetting<string>(DEFAULT_DATE_FORMAT_TZ);
  return timeZone === 'Browser' ? moment.tz.guess() : timeZone;
};
