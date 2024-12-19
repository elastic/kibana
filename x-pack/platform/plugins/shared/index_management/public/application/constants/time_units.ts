/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const timeUnits = [
  {
    value: 'd',
    text: i18n.translate('xpack.idxMgmt.dataStream.retention.timeUnits.daysLabel', {
      defaultMessage: 'days',
    }),
  },
  {
    value: 'h',
    text: i18n.translate('xpack.idxMgmt.dataStream.retention.timeUnits.hoursLabel', {
      defaultMessage: 'hours',
    }),
  },
  {
    value: 'm',
    text: i18n.translate('xpack.idxMgmt.dataStream.retention.timeUnits.minutesLabel', {
      defaultMessage: 'minutes',
    }),
  },
  {
    value: 's',
    text: i18n.translate('xpack.idxMgmt.dataStream.retention.timeUnits.secondsLabel', {
      defaultMessage: 'seconds',
    }),
  },
];

// These are the time units that are not supported by the UI, but are supported by the ES API.
export const extraTimeUnits = [
  {
    value: 'ms',
    text: i18n.translate('xpack.idxMgmt.dataStream.retention.timeUnits.msLabel', {
      defaultMessage: 'milliseconds',
    }),
  },
  {
    value: 'micros',
    text: i18n.translate('xpack.idxMgmt.dataStream.retention.timeUnits.microsLabel', {
      defaultMessage: 'microseconds',
    }),
  },
  {
    value: 'nanos',
    text: i18n.translate('xpack.idxMgmt.dataStream.retention.timeUnits.nanosLabel', {
      defaultMessage: 'nanoseconds',
    }),
  },
];
