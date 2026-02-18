/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { FormData, ValidationFunc } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';

import type { DslStepMetaFields, PreservedTimeUnit } from './types';
import { toMilliseconds } from './utils';

const { emptyField, isInteger } = fieldValidators;

/**
 * `hook-form-lib` validators receive a *flattened* `formData` object (keys like
 * `_meta.downsampleSteps[0].afterValue`). We keep access centralized to reduce casts.
 */
type StreamsDslFlatFormData = Record<string, unknown>;
type DslValidationFunc<V = unknown> = ValidationFunc<FormData, string, V>;
type DslValidationArg<V = unknown> = Parameters<DslValidationFunc<V>>[0];

type DslStepField = keyof DslStepMetaFields;
const getStepFieldPath = (stepIndex: number, field: DslStepField): string =>
  `_meta.downsampleSteps[${stepIndex}].${field}`;

const asFlatFormData = (formData: unknown): StreamsDslFlatFormData =>
  (formData ?? {}) as StreamsDslFlatFormData;

const getAsString = (formData: unknown, path: string, fallback = ''): string => {
  const value = asFlatFormData(formData)[path];
  return value === undefined || value === null ? fallback : String(value);
};

const getAsNumber = (formData: unknown, path: string, fallback: number): number => {
  const value = asFlatFormData(formData)[path];
  return typeof value === 'number' ? value : fallback;
};

const FIVE_MINUTES_IN_MS = 5 * 60_000;

const getStepIndexFromPath = (path: string): number | null => {
  const match = /^_meta\.downsampleSteps\[(\d+)\]\./.exec(path);
  if (!match) return null;
  const index = Number(match[1]);
  return Number.isFinite(index) ? index : null;
};

export const requiredAfterValue: DslValidationFunc = (arg) =>
  emptyField(
    i18n.translate('xpack.streams.editDslStepsFlyout.afterRequired', {
      defaultMessage: 'A value is required.',
    })
  )(arg);

export const afterMustBeNonNegative: DslValidationFunc = (arg) => {
  const { value, path } = arg as DslValidationArg;

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

export const afterMustBeInteger: DslValidationFunc = (arg) =>
  isInteger({
    message: i18n.translate('xpack.streams.editDslStepsFlyout.integerRequired', {
      defaultMessage: 'An integer is required.',
    }),
  })(arg);

export const afterGreaterThanPreviousStep: DslValidationFunc = (arg) => {
  const { formData, path } = arg as DslValidationArg;

  const stepIndex = getStepIndexFromPath(path);
  if (stepIndex === null) return;
  if (stepIndex === 0) return;

  const getAfterMs = (index: number): { ms: number; esFormat?: string } => {
    const value = getAsString(formData, getStepFieldPath(index, 'afterValue'));
    const unit = getAsString(
      formData,
      getStepFieldPath(index, 'afterUnit'),
      'd'
    ) as PreservedTimeUnit;
    const computed = toMilliseconds(value, unit);
    const ms = getAsNumber(
      formData,
      getStepFieldPath(index, 'afterToMilliSeconds'),
      Number.isFinite(computed) ? computed : -1
    );
    const esFormat = value.trim() === '' ? undefined : `${Number(value)}${String(unit)}`;
    return { ms, esFormat };
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

export const requiredFixedIntervalValue: DslValidationFunc = (arg) =>
  emptyField(
    i18n.translate('xpack.streams.editDslStepsFlyout.fixedIntervalRequired', {
      defaultMessage: 'A value is required.',
    })
  )(arg);

export const fixedIntervalMustBeGreaterThanZero: DslValidationFunc = (arg) => {
  const { value } = arg as DslValidationArg;
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

export const fixedIntervalMustBeInteger: DslValidationFunc = (arg) =>
  isInteger({
    message: i18n.translate('xpack.streams.editDslStepsFlyout.integerRequired', {
      defaultMessage: 'An integer is required.',
    }),
  })(arg);

// Elasticsearch enforces a minimum downsampling `fixed_interval` of 5 minutes for data stream lifecycle
// downsampling rounds.
export const fixedIntervalMustBeAtLeastFiveMinutes: DslValidationFunc = (arg) => {
  const { value, formData, path } = arg as DslValidationArg;

  const stepIndex = getStepIndexFromPath(path);
  if (stepIndex === null) return;

  if (value === '' || value === undefined || value === null) return;
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return;
  if (!Number.isInteger(num)) return;

  const unit = getAsString(
    formData,
    getStepFieldPath(stepIndex, 'fixedIntervalUnit'),
    'd'
  ) as PreservedTimeUnit;
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

export const fixedIntervalMultipleOfPreviousStep: DslValidationFunc = (arg) => {
  const { formData, path } = arg as DslValidationArg;

  const stepIndex = getStepIndexFromPath(path);
  if (stepIndex === null) return;
  if (stepIndex === 0) return;

  const getIntervalFor = (index: number) => {
    const value = getAsString(formData, getStepFieldPath(index, 'fixedIntervalValue'));
    const unit = getAsString(
      formData,
      getStepFieldPath(index, 'fixedIntervalUnit'),
      'd'
    ) as PreservedTimeUnit;

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
