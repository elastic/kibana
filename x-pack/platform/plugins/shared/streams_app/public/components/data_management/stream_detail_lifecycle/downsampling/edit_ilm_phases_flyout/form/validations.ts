/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ValidationFunc } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';

import type { DownsamplePhase, TimeUnit } from './types';
import { toMilliseconds } from './utils';

const { emptyField, isInteger } = fieldValidators;
type AnyValidationFunc = ValidationFunc<any, any, any>;

/**
 * Note: validation functions receive a *flattened* `formData` object (keys like
 * `_meta.warm.minAgeValue`).
 */
const isPhaseEnabled = (
  formData: Record<string, unknown>,
  phase: 'hot' | 'warm' | 'cold' | 'frozen' | 'delete'
) => Boolean((formData as any)[`_meta.${phase}.enabled`]);

const isDownsampleEnabled = (formData: Record<string, unknown>, phase: DownsamplePhase) =>
  Boolean((formData as any)[`_meta.${phase}.downsampleEnabled`]);

export const requiredMinAgeValue =
  (phase: 'warm' | 'cold' | 'frozen' | 'delete'): AnyValidationFunc =>
  (...args) => {
    const [{ formData }] = args as any as [{ formData: Record<string, unknown> }];
    if (!isPhaseEnabled(formData, phase)) return;
    return emptyField(
      i18n.translate('xpack.streams.editIlmPhasesFlyout.minAgeRequired', {
        defaultMessage: 'A value is required.',
      })
    )(...args);
  };

export const ifExistsNumberNonNegative: AnyValidationFunc = (...args) => {
  const [{ value, formData, path }] = args as any as [
    { value: unknown; formData: Record<string, unknown>; path: string }
  ];

  // Only validate when editing an enabled phase minAgeValue field.
  const match = /^_meta\.(warm|cold|frozen|delete)\.minAgeValue$/.exec(path);
  if (match && !isPhaseEnabled(formData, match[1] as any)) return;

  if (value === '' || value === undefined || value === null) return;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    return {
      message: i18n.translate('xpack.streams.editIlmPhasesFlyout.nonNegativeNumberRequired', {
        defaultMessage: 'A non-negative number is required.',
      }),
    };
  }
};

export const minAgeMustBeInteger =
  (phase: 'warm' | 'cold' | 'frozen' | 'delete'): AnyValidationFunc =>
  (...args) => {
    const [{ formData }] = args as any as [{ formData: Record<string, unknown> }];
    if (!isPhaseEnabled(formData, phase)) return;
    return isInteger({
      message: i18n.translate('xpack.streams.editIlmPhasesFlyout.integerRequired', {
        defaultMessage: 'An integer is required.',
      }),
    })(...args);
  };

/**
 * Mirrors ILM editor behavior: ensure min_age for a phase is >= previous phases min_age.
 * Uses `_meta.<phase>.minAgeToMilliSeconds` computed values and formats the current values
 * for display in error messages.
 */
export const minAgeGreaterThanPreviousPhase =
  (phase: 'cold' | 'frozen' | 'delete'): AnyValidationFunc =>
  (...args) => {
    const [{ formData }] = args as any as [{ formData: Record<string, unknown> }];
    if (!isPhaseEnabled(formData, phase)) return;

    const getValueFor = (p: 'warm' | 'cold' | 'frozen' | 'delete') => {
      if (!isPhaseEnabled(formData, p)) {
        return { milli: -1, esFormat: undefined as string | undefined };
      }

      const minAgeValue = String((formData as any)[`_meta.${p}.minAgeValue`] ?? '');
      const minAgeUnit = String((formData as any)[`_meta.${p}.minAgeUnit`] ?? 'd') as TimeUnit;
      const milli = (formData as any)[`_meta.${p}.minAgeToMilliSeconds`] ?? -1;

      const computed = toMilliseconds(minAgeValue, minAgeUnit);
      const esFormat =
        minAgeValue.trim() === '' ? undefined : `${Number(minAgeValue)}${String(minAgeUnit)}`;

      return {
        milli: typeof milli === 'number' ? milli : computed,
        esFormat,
      };
    };

    const minAgeValues = {
      warm: getValueFor('warm'),
      cold: getValueFor('cold'),
      frozen: getValueFor('frozen'),
      delete: getValueFor('delete'),
    };

    const i18nErrors = {
      greaterThanWarmPhase: i18n.translate(
        'xpack.streams.editIlmPhasesFlyout.minAgeSmallerThanWarmPhaseError',
        {
          defaultMessage: 'Must be greater or equal than the warm phase value ({value})',
          values: { value: minAgeValues.warm.esFormat },
        }
      ),
      greaterThanColdPhase: i18n.translate(
        'xpack.streams.editIlmPhasesFlyout.minAgeSmallerThanColdPhaseError',
        {
          defaultMessage: 'Must be greater or equal than the cold phase value ({value})',
          values: { value: minAgeValues.cold.esFormat },
        }
      ),
      greaterThanFrozenPhase: i18n.translate(
        'xpack.streams.editIlmPhasesFlyout.minAgeSmallerThanFrozenPhaseError',
        {
          defaultMessage: 'Must be greater or equal than the frozen phase value ({value})',
          values: { value: minAgeValues.frozen.esFormat },
        }
      ),
    };

    if (phase === 'cold') {
      if (minAgeValues.warm.milli >= 0 && minAgeValues.cold.milli < minAgeValues.warm.milli) {
        return { message: i18nErrors.greaterThanWarmPhase };
      }
      return;
    }

    if (phase === 'frozen') {
      if (minAgeValues.cold.milli >= 0 && minAgeValues.frozen.milli < minAgeValues.cold.milli) {
        return { message: i18nErrors.greaterThanColdPhase };
      }
      if (minAgeValues.warm.milli >= 0 && minAgeValues.frozen.milli < minAgeValues.warm.milli) {
        return { message: i18nErrors.greaterThanWarmPhase };
      }
      return;
    }

    if (phase === 'delete') {
      if (minAgeValues.frozen.milli >= 0 && minAgeValues.delete.milli < minAgeValues.frozen.milli) {
        return { message: i18nErrors.greaterThanFrozenPhase };
      }
      if (minAgeValues.cold.milli >= 0 && minAgeValues.delete.milli < minAgeValues.cold.milli) {
        return { message: i18nErrors.greaterThanColdPhase };
      }
      if (minAgeValues.warm.milli >= 0 && minAgeValues.delete.milli < minAgeValues.warm.milli) {
        return { message: i18nErrors.greaterThanWarmPhase };
      }
    }
  };

export const requiredDownsampleIntervalValue =
  (phase: DownsamplePhase): AnyValidationFunc =>
  (...args) => {
    const [{ formData }] = args as any as [{ formData: Record<string, unknown> }];
    if (!isPhaseEnabled(formData, phase)) return;
    if (!isDownsampleEnabled(formData, phase)) return;
    return emptyField(
      i18n.translate('xpack.streams.editIlmPhasesFlyout.downsampleIntervalRequired', {
        defaultMessage: 'A value is required.',
      })
    )(...args);
  };

export const ifExistsNumberGreaterThanZero =
  (phase: DownsamplePhase): AnyValidationFunc =>
  (...args) => {
    const [{ value, formData }] = args as any as [
      { value: unknown; formData: Record<string, unknown> }
    ];
    if (!isPhaseEnabled(formData, phase)) return;
    if (!isDownsampleEnabled(formData, phase)) return;

    if (value === '' || value === undefined || value === null) return;
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) {
      return {
        message: i18n.translate('xpack.streams.editIlmPhasesFlyout.numberGreaterThan0Required', {
          defaultMessage: 'A number greater than 0 is required.',
        }),
      };
    }
  };

export const downsampleIntervalMustBeInteger =
  (phase: DownsamplePhase): AnyValidationFunc =>
  (...args) => {
    const [{ formData }] = args as any as [{ formData: Record<string, unknown> }];
    if (!isPhaseEnabled(formData, phase)) return;
    if (!isDownsampleEnabled(formData, phase)) return;
    return isInteger({
      message: i18n.translate('xpack.streams.editIlmPhasesFlyout.integerRequired', {
        defaultMessage: 'An integer is required.',
      }),
    })(...args);
  };

export const downsampleIntervalMultipleOfPreviousOne =
  (phase: 'warm' | 'cold'): AnyValidationFunc =>
  (...args) => {
    const [{ formData }] = args as any as [{ formData: Record<string, unknown> }];
    if (!isPhaseEnabled(formData, phase)) return;
    if (!isDownsampleEnabled(formData, phase)) return;

    const getValueFor = (p: DownsamplePhase) => {
      if (!isPhaseEnabled(formData, p)) return null;
      if (!isDownsampleEnabled(formData, p)) return null;

      const value = String((formData as any)[`_meta.${p}.downsample.fixedIntervalValue`] ?? '');
      const unit = String(
        (formData as any)[`_meta.${p}.downsample.fixedIntervalUnit`] ?? 'd'
      ) as TimeUnit;

      if (!value || !unit) return null;

      const milliseconds = toMilliseconds(value, unit);
      if (!Number.isFinite(milliseconds) || milliseconds <= 0) return null;

      return { milliseconds, esFormat: `${value}${unit}` };
    };

    const intervalValues = {
      hot: getValueFor('hot'),
      warm: getValueFor('warm'),
      cold: getValueFor('cold'),
    };

    const checkIfGreaterAndMultiple = (nextInterval: number, previousInterval: number): boolean =>
      nextInterval > previousInterval && nextInterval % previousInterval === 0;

    if (phase === 'warm' && intervalValues.warm && intervalValues.hot) {
      if (
        !checkIfGreaterAndMultiple(
          intervalValues.warm.milliseconds,
          intervalValues.hot.milliseconds
        )
      ) {
        return {
          message: i18n.translate(
            'xpack.streams.editIlmPhasesFlyout.downsamplePreviousIntervalWarmPhaseError',
            {
              defaultMessage:
                'Must be greater than and a multiple of the hot phase value ({value})',
              values: { value: intervalValues.hot.esFormat },
            }
          ),
        };
      }
    }

    if (phase === 'cold' && intervalValues.cold) {
      if (intervalValues.warm) {
        if (
          !checkIfGreaterAndMultiple(
            intervalValues.cold.milliseconds,
            intervalValues.warm.milliseconds
          )
        ) {
          return {
            message: i18n.translate(
              'xpack.streams.editIlmPhasesFlyout.downsamplePreviousIntervalColdPhaseWarmError',
              {
                defaultMessage:
                  'Must be greater than and a multiple of the warm phase value ({value})',
                values: { value: intervalValues.warm.esFormat },
              }
            ),
          };
        }
      } else if (intervalValues.hot) {
        if (
          !checkIfGreaterAndMultiple(
            intervalValues.cold.milliseconds,
            intervalValues.hot.milliseconds
          )
        ) {
          return {
            message: i18n.translate(
              'xpack.streams.editIlmPhasesFlyout.downsamplePreviousIntervalColdPhaseHotError',
              {
                defaultMessage:
                  'Must be greater than and a multiple of the hot phase value ({value})',
                values: { value: intervalValues.hot.esFormat },
              }
            ),
          };
        }
      }
    }
  };

export const requiredSearchableSnapshotRepository: AnyValidationFunc = (...args) => {
  const [{ formData }] = args as any as [{ formData: Record<string, unknown> }];
  const coldEnabled =
    isPhaseEnabled(formData, 'cold') &&
    Boolean((formData as any)['_meta.cold.searchableSnapshotEnabled']);
  const frozenEnabled = isPhaseEnabled(formData, 'frozen');

  if (!coldEnabled && !frozenEnabled) return;

  return emptyField(
    i18n.translate('xpack.streams.editIlmPhasesFlyout.searchableSnapshotRepoRequired', {
      defaultMessage: 'A snapshot repository is required.',
    })
  )(...args);
};
