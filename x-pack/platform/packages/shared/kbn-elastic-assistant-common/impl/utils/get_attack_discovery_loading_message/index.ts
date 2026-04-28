/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_END, DEFAULT_START } from '../../alerts/get_open_and_acknowledged_alerts_query';
import * as i18n from './translations';

export const formatDatemath = (date: string): string => {
  switch (date) {
    case 'now/d':
      return i18n.START_OF_THE_DAY();
    case 'now/w':
      return i18n.START_OF_THE_WEEK();
    case 'now/M':
      return i18n.START_OF_THE_MONTH();
    case 'now/y':
      return i18n.START_OF_THE_YEAR();
    case 'now-15m':
      return i18n.FIFTEEN_MINUTES_AGO();
    case 'now-30m':
      return i18n.THIRTY_MINUTES_AGO();
    case 'now-1h':
      return i18n.ONE_HOUR_AGO();
    case 'now-24h':
      return i18n.TWENTY_FOUR_HOURS_AGO();
    case 'now-7d':
      return i18n.SEVEN_DAYS_AGO();
    case 'now-30d':
      return i18n.THIRTY_DAYS_AGO();
    case 'now-90d':
      return i18n.NINETY_DAYS_AGO();
    case 'now-1y':
      return i18n.ONE_YEAR_AGO();
    case 'now':
      return i18n.NOW();
    default:
      return date;
  }
};

export const getAttackDiscoveryLoadingMessage = ({
  alertsCount,
  end,
  start,
}: {
  alertsCount: number;
  end?: string | null;
  start?: string | null;
}): string => {
  if (start === DEFAULT_START && end === DEFAULT_END) {
    return i18n.AI_IS_CURRENTLY_ANALYZING(alertsCount);
  }

  const formattedStart = start != null ? formatDatemath(start) : start;
  const formattedEnd = end != null ? formatDatemath(end) : end;

  if (formattedEnd != null && formattedStart != null) {
    return i18n.AI_IS_CURRENTLY_ANALYZING_RANGE({ alertsCount, end: formattedEnd, start: formattedStart });
  } else if (formattedStart != null) {
    return i18n.AI_IS_CURRENTLY_ANALYZING_FROM({ alertsCount, from: formattedStart });
  } else {
    return i18n.AI_IS_CURRENTLY_ANALYZING(alertsCount);
  }
};
