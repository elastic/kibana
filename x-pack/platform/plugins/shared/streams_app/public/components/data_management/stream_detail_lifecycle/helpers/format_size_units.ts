/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

const timeUnitsLabels = {
  d: {
    plural: i18n.translate('xpack.streams.streamDetailView.timeUnits.daysLabel', {
      defaultMessage: 'days',
    }),
    singular: i18n.translate('xpack.streams.streamDetailView.timeUnits.dayLabel', {
      defaultMessage: 'day',
    }),
  },
  h: {
    plural: i18n.translate('xpack.streams.streamDetailView.timeUnits.hoursLabel', {
      defaultMessage: 'hours',
    }),
    singular: i18n.translate('xpack.streams.streamDetailView.timeUnits.hourLabel', {
      defaultMessage: 'hour',
    }),
  },
  m: {
    plural: i18n.translate('xpack.streams.streamDetailView.timeUnits.minutesLabel', {
      defaultMessage: 'minutes',
    }),
    singular: i18n.translate('xpack.streams.streamDetailView.timeUnits.minuteLabel', {
      defaultMessage: 'minute',
    }),
  },
  s: {
    plural: i18n.translate('xpack.streams.streamDetailView.timeUnits.secondsLabel', {
      defaultMessage: 'seconds',
    }),
    singular: i18n.translate('xpack.streams.streamDetailView.timeUnits.secondLabel', {
      defaultMessage: 'second',
    }),
  },
  ms: {
    plural: i18n.translate('xpack.streams.streamDetailView.timeUnits.millisLabel', {
      defaultMessage: 'milliseconds',
    }),
    singular: i18n.translate('xpack.streams.streamDetailView.timeUnits.milliLabel', {
      defaultMessage: 'millisecond',
    }),
  },
  micros: {
    plural: i18n.translate('xpack.streams.streamDetailView.timeUnits.microsLabel', {
      defaultMessage: 'microseconds',
    }),
    singular: i18n.translate('xpack.streams.streamDetailView.timeUnits.microLabel', {
      defaultMessage: 'microsecond',
    }),
  },
  nanos: {
    plural: i18n.translate('xpack.streams.streamDetailView.timeUnits.nanosLabel', {
      defaultMessage: 'nanoseconds',
    }),
    singular: i18n.translate('xpack.streams.streamDetailView.timeUnits.nanoLabel', {
      defaultMessage: 'nanosecond',
    }),
  },
};

export type StreamsTimeUnit = keyof typeof timeUnitsLabels;

export const getTimeUnitLabel = (
  unit: StreamsTimeUnit,
  { plural = true }: { plural?: boolean } = {}
): string => {
  const labels = timeUnitsLabels[unit];
  return plural ? labels.plural : labels.singular;
};

export const splitSizeAndUnits = (field: string): { size: string; unit: string } => {
  let size = '';
  let unit = '';

  const result = /^(\d+)([a-zA-Z]+)$/.exec(field);
  if (result) {
    size = result[1];
    unit = result[2];
  }

  return {
    size,
    unit,
  };
};

export const getTimeSizeAndUnitLabel = (value: string | undefined) => {
  if (!value) return undefined;
  const { size, unit } = splitSizeAndUnits(value);
  const labels = timeUnitsLabels[unit as keyof typeof timeUnitsLabels];
  if (!labels) return value;
  return `${size} ${Number(size) === 1 ? labels.singular : labels.plural}`;
};

const MS_IN_SECOND = 1000;
const SECONDS_IN_MINUTE = 60;
const MINUTES_IN_HOUR = 60;
const HOURS_IN_DAY = 24;

const getMsPerUnit = (unit: string): number | undefined => {
  switch (unit) {
    case 'nanos':
      return 1 / (MS_IN_SECOND * MS_IN_SECOND);
    case 'micros':
      return 1 / MS_IN_SECOND;
    case 'ms':
      return 1;
    case 's':
      return MS_IN_SECOND;
    case 'm':
      return MS_IN_SECOND * SECONDS_IN_MINUTE;
    case 'h':
      return MS_IN_SECOND * SECONDS_IN_MINUTE * MINUTES_IN_HOUR;
    case 'd':
      return MS_IN_SECOND * SECONDS_IN_MINUTE * MINUTES_IN_HOUR * HOURS_IN_DAY;
    default:
      return undefined;
  }
};

/**
 * Converts a time value to milliseconds
 */
export const toMillis = (value?: string): number | undefined => {
  if (!value) return undefined;

  const { size, unit } = splitSizeAndUnits(value);
  const multiplier = getMsPerUnit(unit);

  return size && multiplier !== undefined ? Number(size) * multiplier : undefined;
};

export const isZeroAge = (value?: string): boolean => {
  if (!value) return false;
  const { size } = splitSizeAndUnits(value);
  const amount = Number(size);
  return Number.isFinite(amount) && amount === 0;
};
