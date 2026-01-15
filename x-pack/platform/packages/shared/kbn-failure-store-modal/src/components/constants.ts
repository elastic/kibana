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
      defaultMessage: 'Days',
    }),
  },
  {
    value: 'h',
    text: i18n.translate('xpack.failureStoreModal.timeUnits.hoursLabel', {
      defaultMessage: 'Hours',
    }),
  },
  {
    value: 'm',
    text: i18n.translate('xpack.failureStoreModal.timeUnits.minutesLabel', {
      defaultMessage: 'Minutes',
    }),
  },
  {
    value: 's',
    text: i18n.translate('xpack.failureStoreModal.timeUnits.secondsLabel', {
      defaultMessage: 'Seconds',
    }),
  },
];

export const extraTimeUnits = [
  {
    value: 'ms',
    text: i18n.translate('xpack.failureStoreModal.timeUnits.msLabel', {
      defaultMessage: 'Milliseconds',
    }),
  },
  {
    value: 'micros',
    text: i18n.translate('xpack.failureStoreModal.timeUnits.microsLabel', {
      defaultMessage: 'Microseconds',
    }),
  },
  {
    value: 'nanos',
    text: i18n.translate('xpack.failureStoreModal.timeUnits.nanosLabel', {
      defaultMessage: 'Nanoseconds',
    }),
  },
];

export const getFailureStorePeriodOptions = (disableButtonLabel?: string) => [
  {
    id: 'disabledLifecycle',
    label:
      disableButtonLabel ??
      i18n.translate('xpack.failureStoreModal.form.options.disabledPeriodLabel', {
        defaultMessage: 'Disabled',
      }),
  },
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
