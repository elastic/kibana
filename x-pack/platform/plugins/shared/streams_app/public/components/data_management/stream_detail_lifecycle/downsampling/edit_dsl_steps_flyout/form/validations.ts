/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ValidationFunc } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';

import type { TimeUnit } from './types';
import { toMilliseconds } from './utils';

const { emptyField, isInteger } = fieldValidators;
type AnyValidationFunc = ValidationFunc<any, any, any>;

const FIVE_MINUTES_IN_MS = 5 * 60_000;

const getStepIndexFromPath = (path: string): number | null => {
  const match = /^_meta\.downsampleSteps\[(\d+)\]\./.exec(path);
  if (!match) return null;
  const index = Number(match[1]);
  return Number.isFinite(index) ? index : null;
};

export const requiredAfterValue: AnyValidationFunc = (...args) => {
  return emptyField(
    i18n.translate('xpack.streams.editDslStepsFlyout.afterRequired', {
      defaultMessage: 'A value is required.',
    })
  )(...args);
};

export const afterMustBeNonNegative: AnyValidationFunc = (...args) => {
  const [{ value, path }] = args as any as [{ value: unknown; path: string }];

  if (!/^_meta\.downsampleSteps\[\d+\]\.afterValue$/.test(path)) return;

  if (value === '' || value === undefined || value === null) return;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    return {
      message: i18n.translate('xpack.streams.editDslStepsFlyout.nonNegativeNumberRequired', {
        defaultMessage: 'A non-negative number is required.',
      }),
    };
  }
};

export const afterMustBeInteger: AnyValidationFunc = (...args: Parameters<AnyValidationFunc>) => {
  return isInteger({
    message: i18n.translate('xpack.streams.editDslStepsFlyout.integerRequired', {
      defaultMessage: 'An integer is required.',
    }),
  })(...args);
};

export const afterGreaterThanPreviousStep: AnyValidationFunc = (...args) => {
  const [{ formData, path }] = args as any as [{ formData: Record<string, unknown>; path: string }];

  const stepIndex = getStepIndexFromPath(path);
  if (stepIndex === null) return;
  if (stepIndex === 0) return;

  const getAfterMs = (index: number): { ms: number; esFormat?: string } => {
    const value = String((formData as any)[`_meta.downsampleSteps[${index}].afterValue`] ?? '');
    const unit = String(
      (formData as any)[`_meta.downsampleSteps[${index}].afterUnit`] ?? 'd'
    ) as TimeUnit;
    const computed = toMilliseconds(value, unit);
    const ms =
      (formData as any)[`_meta.downsampleSteps[${index}].afterToMilliSeconds`] ??
      (Number.isFinite(computed) ? computed : -1);
    const esFormat = value.trim() === '' ? undefined : `${Number(value)}${unit}`;
    return { ms: typeof ms === 'number' ? ms : computed, esFormat };
  };

  const previous = getAfterMs(stepIndex - 1);
  const current = getAfterMs(stepIndex);

  if (previous.ms >= 0 && current.ms >= 0 && current.ms < previous.ms) {
    return {
      message: i18n.translate('xpack.streams.editDslStepsFlyout.afterSmallerThanPreviousError', {
        defaultMessage: 'Must be greater or equal than the previous step value ({value})',
        values: { value: previous.esFormat },
      }),
    };
  }
};

export const requiredFixedIntervalValue: AnyValidationFunc = (...args) => {
  return emptyField(
    i18n.translate('xpack.streams.editDslStepsFlyout.fixedIntervalRequired', {
      defaultMessage: 'A value is required.',
    })
  )(...args);
};

export const fixedIntervalMustBeGreaterThanZero: AnyValidationFunc = (
  ...args: Parameters<AnyValidationFunc>
) => {
  const [{ value }] = args as any as [{ value: unknown }];
  if (value === '' || value === undefined || value === null) return;
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    return {
      message: i18n.translate('xpack.streams.editDslStepsFlyout.numberGreaterThan0Required', {
        defaultMessage: 'A number greater than 0 is required.',
      }),
    };
  }
};

export const fixedIntervalMustBeInteger: AnyValidationFunc = (
  ...args: Parameters<AnyValidationFunc>
) => {
  return isInteger({
    message: i18n.translate('xpack.streams.editDslStepsFlyout.integerRequired', {
      defaultMessage: 'An integer is required.',
    }),
  })(...args);
};

// Elasticsearch enforces a minimum downsampling `fixed_interval` of 5 minutes for data stream lifecycle
// downsampling rounds.
export const fixedIntervalMustBeAtLeastFiveMinutes: AnyValidationFunc = (...args) => {
  const [{ value, formData, path }] = args as any as [
    { value: unknown; formData: Record<string, unknown>; path: string }
  ];

  const stepIndex = getStepIndexFromPath(path);
  if (stepIndex === null) return;

  if (value === '' || value === undefined || value === null) return;
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return;
  if (!Number.isInteger(num)) return;

  const unit = String(
    (formData as any)[`_meta.downsampleSteps[${stepIndex}].fixedIntervalUnit`] ?? 'd'
  ) as TimeUnit;
  const milliseconds = toMilliseconds(String(value), unit);
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return;

  if (milliseconds < FIVE_MINUTES_IN_MS) {
    return {
      message: i18n.translate('xpack.streams.editDslStepsFlyout.fixedIntervalMinFiveMinutes', {
        defaultMessage: 'Must be at least 5 minutes.',
      }),
    };
  }
};

export const fixedIntervalMultipleOfPreviousStep: AnyValidationFunc = (...args) => {
  const [{ formData, path }] = args as any as [{ formData: Record<string, unknown>; path: string }];

  const stepIndex = getStepIndexFromPath(path);
  if (stepIndex === null) return;
  if (stepIndex === 0) return;

  const getIntervalFor = (index: number) => {
    const value = String(
      (formData as any)[`_meta.downsampleSteps[${index}].fixedIntervalValue`] ?? ''
    );
    const unit = String(
      (formData as any)[`_meta.downsampleSteps[${index}].fixedIntervalUnit`] ?? 'd'
    ) as TimeUnit;

    if (!value || !unit) return null;
    const milliseconds = toMilliseconds(value, unit);
    if (!Number.isFinite(milliseconds) || milliseconds <= 0) return null;

    return { milliseconds, esFormat: `${value}${unit}` };
  };

  const current = getIntervalFor(stepIndex);
  const previous = getIntervalFor(stepIndex - 1);
  if (!current || !previous) return;

  const isGreaterThanAndMultipleOfPrevious =
    current.milliseconds > previous.milliseconds &&
    current.milliseconds % previous.milliseconds === 0;
  if (!isGreaterThanAndMultipleOfPrevious) {
    return {
      message: i18n.translate(
        'xpack.streams.editDslStepsFlyout.fixedIntervalPreviousIntervalError',
        {
          defaultMessage:
            'Must be greater than and a multiple of the previous step value ({value})',
          values: { value: previous.esFormat },
        }
      ),
    };
  }
};
