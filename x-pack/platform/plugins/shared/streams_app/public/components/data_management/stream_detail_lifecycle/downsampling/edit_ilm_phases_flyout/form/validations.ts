/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ValidationFunc } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';

import type { DownsamplePhase, PreservedTimeUnit } from './types';
import { toMilliseconds } from './utils';

const { emptyField, isInteger } = fieldValidators;

type PhaseName = 'hot' | 'warm' | 'cold' | 'frozen' | 'delete';
type MinAgePhase = Exclude<PhaseName, 'hot'>;

/**
 * `hook-form-lib` validators receive a *flattened* `formData` object (keys like
 * `_meta.warm.minAgeValue`). We keep access centralized to reduce `any`/casts at call sites.
 */
type StreamsIlmFlatFormData = Record<string, unknown>;
type IlmValidationFunc<V = unknown> = ValidationFunc<any, string, V>;
type IlmValidationArg<V = unknown> = Parameters<IlmValidationFunc<V>>[0];

const asFlatFormData = (formData: unknown): StreamsIlmFlatFormData =>
  (formData ?? {}) as StreamsIlmFlatFormData;

const getAsBoolean = (formData: unknown, path: string): boolean =>
  Boolean(asFlatFormData(formData)[path]);

const getAsString = (formData: unknown, path: string, fallback = ''): string => {
  const value = asFlatFormData(formData)[path];
  return value === undefined || value === null ? fallback : String(value);
};

const getAsNumber = (formData: unknown, path: string, fallback: number): number => {
  const value = asFlatFormData(formData)[path];
  return typeof value === 'number' ? value : fallback;
};

/**
 * Note: validation functions receive a *flattened* `formData` object (keys like
 * `_meta.warm.minAgeValue`).
 */
const isPhaseEnabled = (formData: unknown, phase: PhaseName): boolean =>
  getAsBoolean(formData, `_meta.${phase}.enabled`);

const isDownsampleEnabled = (formData: unknown, phase: DownsamplePhase): boolean =>
  getAsBoolean(formData, `_meta.${phase}.downsampleEnabled`);

export const requiredMinAgeValue =
  (phase: MinAgePhase): IlmValidationFunc =>
  (arg) => {
    if (!isPhaseEnabled(arg.formData, phase)) return;
    return emptyField(
      i18n.translate('xpack.streams.editIlmPhasesFlyout.minAgeRequired', {
        defaultMessage: 'A value is required.',
      })
    )(arg);
  };

export const ifExistsNumberNonNegative: IlmValidationFunc = (arg) => {
  const { value, formData, path } = arg as IlmValidationArg;

  // Only validate when editing an enabled phase minAgeValue field.
  const match = /^_meta\.(warm|cold|frozen|delete)\.minAgeValue$/.exec(path);
  const phase = (match?.[1] as MinAgePhase | undefined) ?? undefined;
  if (phase && !isPhaseEnabled(formData, phase)) return;

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
  (phase: MinAgePhase): IlmValidationFunc =>
  (arg) => {
    if (!isPhaseEnabled(arg.formData, phase)) return;
    return isInteger({
      message: i18n.translate('xpack.streams.editIlmPhasesFlyout.integerRequired', {
        defaultMessage: 'An integer is required.',
      }),
    })(arg);
  };

/**
 * Mirrors ILM editor behavior: ensure min_age for a phase is >= previous phases min_age.
 * Uses `_meta.<phase>.minAgeToMilliSeconds` computed values and formats the current values
 * for display in error messages.
 */
export const minAgeGreaterThanPreviousPhase =
  (phase: 'cold' | 'frozen' | 'delete'): IlmValidationFunc =>
  (arg) => {
    const { formData } = arg as IlmValidationArg;
    if (!isPhaseEnabled(formData, phase)) return;

    const getValueFor = (p: 'warm' | 'cold' | 'frozen' | 'delete') => {
      if (!isPhaseEnabled(formData, p)) {
        return { milli: -1, esFormat: undefined as string | undefined };
      }

      const minAgeValue = getAsString(formData, `_meta.${p}.minAgeValue`);
      const minAgeUnit = getAsString(formData, `_meta.${p}.minAgeUnit`, 'd') as PreservedTimeUnit;
      const milli = getAsNumber(formData, `_meta.${p}.minAgeToMilliSeconds`, -1);

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
  (phase: DownsamplePhase): IlmValidationFunc =>
  (arg) => {
    if (!isPhaseEnabled(arg.formData, phase)) return;
    if (!isDownsampleEnabled(arg.formData, phase)) return;
    return emptyField(
      i18n.translate('xpack.streams.editIlmPhasesFlyout.downsampleIntervalRequired', {
        defaultMessage: 'A value is required.',
      })
    )(arg);
  };

export const ifExistsNumberGreaterThanZero =
  (phase: DownsamplePhase): IlmValidationFunc =>
  (arg) => {
    const { value, formData } = arg as IlmValidationArg;
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
  (phase: DownsamplePhase): IlmValidationFunc =>
  (arg) => {
    if (!isPhaseEnabled(arg.formData, phase)) return;
    if (!isDownsampleEnabled(arg.formData, phase)) return;
    return isInteger({
      message: i18n.translate('xpack.streams.editIlmPhasesFlyout.integerRequired', {
        defaultMessage: 'An integer is required.',
      }),
    })(arg);
  };

export const downsampleIntervalMultipleOfPreviousOne =
  (phase: 'warm' | 'cold'): IlmValidationFunc =>
  (arg) => {
    const { formData } = arg as IlmValidationArg;
    if (!isPhaseEnabled(formData, phase)) return;
    if (!isDownsampleEnabled(formData, phase)) return;

    const getValueFor = (p: DownsamplePhase) => {
      if (!isPhaseEnabled(formData, p)) return null;
      if (!isDownsampleEnabled(formData, p)) return null;

      const value = getAsString(formData, `_meta.${p}.downsample.fixedIntervalValue`);
      const unit = getAsString(
        formData,
        `_meta.${p}.downsample.fixedIntervalUnit`,
        'd'
      ) as PreservedTimeUnit;

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

export const requiredSearchableSnapshotRepository: IlmValidationFunc = (arg) => {
  const { formData } = arg as IlmValidationArg;
  const coldEnabled =
    isPhaseEnabled(formData, 'cold') &&
    getAsBoolean(formData, '_meta.cold.searchableSnapshotEnabled');
  const frozenEnabled = isPhaseEnabled(formData, 'frozen');

  if (!coldEnabled && !frozenEnabled) return;

  return emptyField(
    i18n.translate('xpack.streams.editIlmPhasesFlyout.searchableSnapshotRepoRequired', {
      defaultMessage: 'A snapshot repository is required.',
    })
  )(arg);
};
