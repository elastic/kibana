/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import moment from 'moment-timezone';
import { useDateFormat, useTimeZone } from '../../common/lib/kibana';

/** The user's `dateFormat` and `dateFormat:tz` advanced settings. */
export interface TimeFormat {
  readonly timeZone: string;
  readonly dateFormat: string;
}

export const useTimeFormat = (): TimeFormat => {
  const timeZone = useTimeZone();
  const dateFormat = useDateFormat();
  return useMemo(() => ({ timeZone, dateFormat }), [timeZone, dateFormat]);
};

export const formatTime = (ms: number, { timeZone, dateFormat }: TimeFormat): string =>
  moment.tz(ms, timeZone).format(dateFormat);

export const formatRange = (startMs: number, endMs: number, format: TimeFormat): string =>
  `${formatTime(startMs, format)} – ${formatTime(endMs, format)}`;

export const formatDuration = (ms: number): string => moment.duration(ms).humanize();
