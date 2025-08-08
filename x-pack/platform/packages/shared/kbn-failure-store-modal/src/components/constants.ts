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
    text: i18n.translate('xpack.failureStoreModal.timeUnits.daysLabel', {
      defaultMessage: 'days',
    }),
  },
  {
    value: 'h',
    text: i18n.translate('xpack.failureStoreModal.timeUnits.hoursLabel', {
      defaultMessage: 'hours',
    }),
  },
  {
    value: 'm',
    text: i18n.translate('xpack.failureStoreModal.timeUnits.minutesLabel', {
      defaultMessage: 'minutes',
    }),
  },
  {
    value: 's',
    text: i18n.translate('xpack.failureStoreModal.timeUnits.secondsLabel', {
      defaultMessage: 'seconds',
    }),
  },
  {
    value: 'ms',
    text: i18n.translate('xpack.failureStoreModal.timeUnits.msLabel', {
      defaultMessage: 'milliseconds',
    }),
  },
  {
    value: 'micros',
    text: i18n.translate('xpack.failureStoreModal.timeUnits.microsLabel', {
      defaultMessage: 'microseconds',
    }),
  },
  {
    value: 'nanos',
    text: i18n.translate('xpack.failureStoreModal.timeUnits.nanosLabel', {
      defaultMessage: 'nanoseconds',
    }),
  },
];

export const failureStorePeriodOptions = [
  {
    id: 'default',
    label: i18n.translate('xpack.failureStoreModal.form.options.defaultPeriodLabel', {
      defaultMessage: 'Default period',
    }),
  },
  {
    id: 'custom',
    label: i18n.translate('xpack.failureStoreModal.form.options.customPeriodLabel', {
      defaultMessage: 'Custom period',
    }),
  },
];
