/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

const timeUnitsLabels = {
  d: i18n.translate('xpack.streams.streamDetailView.timeUnits.daysLabel', {
    defaultMessage: 'days',
  }),
  h: i18n.translate('xpack.streams.streamDetailView.timeUnits.hoursLabel', {
    defaultMessage: 'hours',
  }),
  m: i18n.translate('xpack.streams.streamDetailView.timeUnits.minutesLabel', {
    defaultMessage: 'minutes',
  }),
  s: i18n.translate('xpack.streams.streamDetailView.timeUnits.secondsLabel', {
    defaultMessage: 'seconds',
  }),
  ms: i18n.translate('xpack.streams.streamDetailView.timeUnits.msLabel', {
    defaultMessage: 'milliseconds',
  }),
  micros: i18n.translate('xpack.streams.streamDetailView.timeUnits.microsLabel', {
    defaultMessage: 'microseconds',
  }),

  nanos: i18n.translate('xpack.streams.streamDetailView.timeUnits.nanosLabel', {
    defaultMessage: 'nanoseconds',
  }),
};

const splitSizeAndUnits = (field: string): { size: string; unit: string } => {
  let size = '';
  let unit = '';

  const result = /(\d+)(\w+)/.exec(field);
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
  const unitLabel = timeUnitsLabels[unit as keyof typeof timeUnitsLabels];
  return unitLabel ? `${size} ${unitLabel}` : value;
};
