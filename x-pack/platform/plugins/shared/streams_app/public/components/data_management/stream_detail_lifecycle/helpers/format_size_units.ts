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

const splitSizeAndUnits = (field: string): { size: string; unit: string } => {
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
