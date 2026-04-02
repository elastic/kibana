/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import type { Moment } from 'moment-timezone';
import type { MlAnomalyRecordDoc } from '@kbn/ml-anomaly-utils';
import type { AnomalyDateFunction } from '@kbn/ml-anomaly-utils/types';

const WEEK_DURATION_IN_SECONDS = moment.duration(1, 'week').asSeconds();

interface TimeValueResultBase {
  formatted: string;
  moment: Moment;
}

interface TimeOfDayValueResult extends TimeValueResultBase {
  dayOffset: number;
}

interface TimeOfWeekValueResult extends TimeValueResultBase {
  dayOffset?: never;
}

export type TimeValueResult = TimeOfDayValueResult | TimeOfWeekValueResult;

const getDisplayMoment = (value: Date | number, timezone?: string) =>
  timezone ? moment.tz(value, timezone) : moment(value);

/**
 * Formats `time_of_day` and `time_of_week` ML values into a display time and
 * returns the resolved display moment so callers can render it differently per surface.
 */
export function formatTimeValue(
  value: number,
  mlFunction: AnomalyDateFunction,
  record?: MlAnomalyRecordDoc,
  timezone?: string
): TimeValueResult {
  // The anomaly timestamp anchors these cyclical values to a concrete day/week
  // so callers can render them in the intended display timezone.
  const date =
    record !== undefined && record.timestamp !== undefined
      ? new Date(record.timestamp)
      : new Date();

  switch (mlFunction) {
    case 'time_of_week': {
      /**
       * `time_of_week` values are modeled as seconds within a week in UTC.
       * Find the current record's position within its display week, subtract it,
       * then add the modeled offset back to land on the matching day/time.
       */
      const remainder = getDisplayMoment(date, timezone).unix() % WEEK_DURATION_IN_SECONDS;
      const utcMoment = moment
        .utc(date)
        .subtract(remainder, 'seconds')
        .startOf('day')
        .add(value, 's');
      // Convert the reconstructed UTC instant into the requested display timezone.
      const displayMoment = getDisplayMoment(utcMoment.valueOf(), timezone);

      return {
        formatted: displayMoment.format('ddd HH:mm'),
        moment: displayMoment,
      };
    }

    case 'time_of_day': {
      /**
       * `time_of_day` values are modeled as seconds after UTC midnight.
       * Rebuild the UTC instant for the anomaly's day, then convert it into the
       * requested display timezone for rendering.
       */
      const utcMoment = moment.utc(date).startOf('day').add(value, 's');
      const displayMoment = getDisplayMoment(utcMoment.valueOf(), timezone);
      // Compare the rendered day against the anomaly's local reference day so
      // callers can show when timezone conversion crosses a day boundary.
      const referenceDate = getDisplayMoment(date, timezone).startOf('day');
      const dayOffset = Math.floor(
        displayMoment.clone().startOf('day').diff(referenceDate, 'days')
      );

      return {
        formatted: displayMoment.format('HH:mm'),
        moment: displayMoment,
        dayOffset,
      };
    }
  }
}
