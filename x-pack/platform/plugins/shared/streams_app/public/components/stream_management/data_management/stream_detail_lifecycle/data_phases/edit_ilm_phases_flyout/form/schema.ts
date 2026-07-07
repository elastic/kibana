/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import type { FieldPath } from 'react-hook-form';
import { PRESERVED_TIME_UNITS } from '../../shared';
import type { IlmPhasesFlyoutFormInternal } from './types';
import { DOWNSAMPLE_PHASES, type DownsamplePhase } from './types';
import { toMilliseconds } from './utils';

export const getDownsampleFieldsToValidateOnChange = (
  phase: DownsamplePhase,
  includeCurrentPhase = true
): Array<FieldPath<IlmPhasesFlyoutFormInternal>> => {
  const getIntervalPath = (p: DownsamplePhase): FieldPath<IlmPhasesFlyoutFormInternal> =>
    `_meta.${p}.downsample.fixedIntervalValue`;

  const phasesToValidate = DOWNSAMPLE_PHASES.slice(
    DOWNSAMPLE_PHASES.indexOf(phase) + (includeCurrentPhase ? 0 : 1)
  );

  // When a phase is validated, also validate all downsample intervals in the next phases.
  return phasesToValidate.map(getIntervalPath);
};

export const getMinAgeFieldsToValidateOnChange = (
  phase: 'warm' | 'cold' | 'frozen' | 'delete'
): Array<FieldPath<IlmPhasesFlyoutFormInternal>> => {
  const getMinAgePath = (
    p: 'warm' | 'cold' | 'frozen' | 'delete'
  ): FieldPath<IlmPhasesFlyoutFormInternal> => `_meta.${p}.minAgeValue`;

  const ordered = ['warm', 'cold', 'frozen', 'delete'] as const;
  const startIndex = ordered.indexOf(phase);
  const phasesToValidate = startIndex < 0 ? ordered : ordered.slice(startIndex);
  return phasesToValidate.map(getMinAgePath);
};

/**
 * Zod schema for the ILM phases flyout internal form model (`_meta.*`).
 */
export const getIlmPhasesFlyoutFormSchema = (): z.ZodType<IlmPhasesFlyoutFormInternal> => {
  const preservedTimeUnitSchema = z.enum(PRESERVED_TIME_UNITS);

  const downsampleSchema = z.object({
    fixedIntervalValue: z.string(),
    fixedIntervalUnit: preservedTimeUnitSchema,
  });

  const minAgeSchema = z.object({
    minAgeValue: z.string(),
    minAgeUnit: preservedTimeUnitSchema,
  });

  const schema: z.ZodType<IlmPhasesFlyoutFormInternal> = z
    .object({
      _meta: z.object({
        hot: z.object({
          enabled: z.boolean(),
          sizeInBytes: z.number(),
          rollover: z.record(z.string(), z.unknown()),
          readonlyEnabled: z.boolean(),
          downsampleEnabled: z.boolean(),
          downsample: downsampleSchema,
        }),
        warm: z
          .object({
            enabled: z.boolean(),
            sizeInBytes: z.number(),
            readonlyEnabled: z.boolean(),
            downsampleEnabled: z.boolean(),
            downsample: downsampleSchema,
          })
          .and(minAgeSchema),
        cold: z
          .object({
            enabled: z.boolean(),
            sizeInBytes: z.number(),
            readonlyEnabled: z.boolean(),
            downsampleEnabled: z.boolean(),
            downsample: downsampleSchema,
            searchableSnapshotEnabled: z.boolean(),
          })
          .and(minAgeSchema),
        frozen: z.object({ enabled: z.boolean() }).and(minAgeSchema),
        delete: z
          .object({ enabled: z.boolean(), deleteSearchableSnapshotEnabled: z.boolean() })
          .and(minAgeSchema),
        searchableSnapshot: z.object({
          repository: z.string(),
        }),
      }),
    })
    .superRefine((data, ctx) => {
      const meta = data._meta;

      const minAgePhases = ['warm', 'cold', 'frozen', 'delete'] as const;
      type MinAgePhase = (typeof minAgePhases)[number];

      const requiredMessage = i18n.translate('xpack.streams.editIlmPhasesFlyout.minAgeRequired', {
        defaultMessage: 'A value is required.',
      });
      const nonNegativeMessage = i18n.translate(
        'xpack.streams.editIlmPhasesFlyout.nonNegativeNumberRequired',
        {
          defaultMessage: 'A non-negative number is required.',
        }
      );
      const integerMessage = i18n.translate('xpack.streams.editIlmPhasesFlyout.integerRequired', {
        defaultMessage: 'An integer is required.',
      });

      const getMinAgeEsFormat = (phase: MinAgePhase): string | undefined => {
        if (!meta[phase].enabled) return;
        const value = meta[phase].minAgeValue.trim();
        if (value === '') return;
        return `${Number(value)}${meta[phase].minAgeUnit}`;
      };

      const getMinAgeMs = (phase: MinAgePhase): number => {
        if (!meta[phase].enabled) return -1;
        const value = meta[phase].minAgeValue.trim();
        if (value === '') return -1;
        return toMilliseconds(value, meta[phase].minAgeUnit);
      };

      for (const phase of minAgePhases) {
        if (!meta[phase].enabled) continue;

        const value = meta[phase].minAgeValue.trim();
        if (value === '') {
          ctx.addIssue({
            code: 'custom',
            path: ['_meta', phase, 'minAgeValue'],
            message: requiredMessage,
          });
          continue;
        }

        const num = Number(value);
        if (!Number.isFinite(num) || num < 0) {
          ctx.addIssue({
            code: 'custom',
            path: ['_meta', phase, 'minAgeValue'],
            message: nonNegativeMessage,
          });
          continue;
        }

        if (!Number.isInteger(num)) {
          ctx.addIssue({
            code: 'custom',
            path: ['_meta', phase, 'minAgeValue'],
            message: integerMessage,
          });
        }
      }

      const minAgeValues = {
        warm: { ms: getMinAgeMs('warm'), es: getMinAgeEsFormat('warm') },
        cold: { ms: getMinAgeMs('cold'), es: getMinAgeEsFormat('cold') },
        frozen: { ms: getMinAgeMs('frozen'), es: getMinAgeEsFormat('frozen') },
        delete: { ms: getMinAgeMs('delete'), es: getMinAgeEsFormat('delete') },
      };

      const warmMinAgeError = i18n.translate(
        'xpack.streams.editIlmPhasesFlyout.minAgeSmallerThanWarmPhaseError',
        {
          defaultMessage: 'Must be greater or equal than the warm phase value ({value})',
          values: { value: minAgeValues.warm.es },
        }
      );
      const coldMinAgeError = i18n.translate(
        'xpack.streams.editIlmPhasesFlyout.minAgeSmallerThanColdPhaseError',
        {
          defaultMessage: 'Must be greater or equal than the cold phase value ({value})',
          values: { value: minAgeValues.cold.es },
        }
      );
      const frozenMinAgeError = i18n.translate(
        'xpack.streams.editIlmPhasesFlyout.minAgeSmallerThanFrozenPhaseError',
        {
          defaultMessage: 'Must be greater or equal than the frozen phase value ({value})',
          values: { value: minAgeValues.frozen.es },
        }
      );

      if (meta.cold.enabled) {
        if (
          minAgeValues.warm.ms >= 0 &&
          minAgeValues.cold.ms >= 0 &&
          minAgeValues.cold.ms < minAgeValues.warm.ms
        ) {
          ctx.addIssue({
            code: 'custom',
            path: ['_meta', 'cold', 'minAgeValue'],
            message: warmMinAgeError,
          });
        }
      }

      if (meta.frozen.enabled) {
        if (
          minAgeValues.cold.ms >= 0 &&
          minAgeValues.frozen.ms >= 0 &&
          minAgeValues.frozen.ms < minAgeValues.cold.ms
        ) {
          ctx.addIssue({
            code: 'custom',
            path: ['_meta', 'frozen', 'minAgeValue'],
            message: coldMinAgeError,
          });
        } else if (
          minAgeValues.warm.ms >= 0 &&
          minAgeValues.frozen.ms >= 0 &&
          minAgeValues.frozen.ms < minAgeValues.warm.ms
        ) {
          ctx.addIssue({
            code: 'custom',
            path: ['_meta', 'frozen', 'minAgeValue'],
            message: warmMinAgeError,
          });
        }
      }

      if (meta.delete.enabled) {
        if (
          minAgeValues.frozen.ms >= 0 &&
          minAgeValues.delete.ms >= 0 &&
          minAgeValues.delete.ms < minAgeValues.frozen.ms
        ) {
          ctx.addIssue({
            code: 'custom',
            path: ['_meta', 'delete', 'minAgeValue'],
            message: frozenMinAgeError,
          });
        } else if (
          minAgeValues.cold.ms >= 0 &&
          minAgeValues.delete.ms >= 0 &&
          minAgeValues.delete.ms < minAgeValues.cold.ms
        ) {
          ctx.addIssue({
            code: 'custom',
            path: ['_meta', 'delete', 'minAgeValue'],
            message: coldMinAgeError,
          });
        } else if (
          minAgeValues.warm.ms >= 0 &&
          minAgeValues.delete.ms >= 0 &&
          minAgeValues.delete.ms < minAgeValues.warm.ms
        ) {
          ctx.addIssue({
            code: 'custom',
            path: ['_meta', 'delete', 'minAgeValue'],
            message: warmMinAgeError,
          });
        }
      }

      const downsampleRequiredMessage = i18n.translate(
        'xpack.streams.editIlmPhasesFlyout.downsampleIntervalRequired',
        { defaultMessage: 'A value is required.' }
      );
      const downsampleGreaterThanZeroMessage = i18n.translate(
        'xpack.streams.editIlmPhasesFlyout.numberGreaterThan0Required',
        { defaultMessage: 'A number greater than 0 is required.' }
      );

      const getDownsampleValue = (phase: DownsamplePhase) => {
        if (!meta[phase].enabled) return null;
        if (!meta[phase].downsampleEnabled) return null;
        const value = meta[phase].downsample.fixedIntervalValue.trim();
        const unit = meta[phase].downsample.fixedIntervalUnit;
        if (value === '') return null;
        const ms = toMilliseconds(value, unit);
        if (!Number.isFinite(ms) || ms <= 0) return null;
        return { ms, es: `${value}${unit}` };
      };

      const downsampleValues = {
        hot: getDownsampleValue('hot'),
        warm: getDownsampleValue('warm'),
        cold: getDownsampleValue('cold'),
      };

      const isIntegerString = (value: string): boolean => {
        const num = Number(value);
        return Number.isFinite(num) && Number.isInteger(num);
      };

      const validateDownsampleInterval = (phase: DownsamplePhase) => {
        if (!meta[phase].enabled) return;
        if (!meta[phase].downsampleEnabled) return;

        const value = meta[phase].downsample.fixedIntervalValue.trim();
        if (value === '') {
          ctx.addIssue({
            code: 'custom',
            path: ['_meta', phase, 'downsample', 'fixedIntervalValue'],
            message: downsampleRequiredMessage,
          });
          return;
        }

        const num = Number(value);
        if (!Number.isFinite(num) || num <= 0) {
          ctx.addIssue({
            code: 'custom',
            path: ['_meta', phase, 'downsample', 'fixedIntervalValue'],
            message: downsampleGreaterThanZeroMessage,
          });
          return;
        }

        if (!isIntegerString(value)) {
          ctx.addIssue({
            code: 'custom',
            path: ['_meta', phase, 'downsample', 'fixedIntervalValue'],
            message: integerMessage,
          });
        }
      };

      for (const phase of DOWNSAMPLE_PHASES) {
        validateDownsampleInterval(phase);
      }

      const checkIfGreaterAndMultiple = (nextInterval: number, previousInterval: number): boolean =>
        nextInterval > previousInterval && nextInterval % previousInterval === 0;

      if (
        meta.warm.enabled &&
        meta.warm.downsampleEnabled &&
        downsampleValues.warm &&
        downsampleValues.hot
      ) {
        if (!checkIfGreaterAndMultiple(downsampleValues.warm.ms, downsampleValues.hot.ms)) {
          ctx.addIssue({
            code: 'custom',
            path: ['_meta', 'warm', 'downsample', 'fixedIntervalValue'],
            message: i18n.translate(
              'xpack.streams.editIlmPhasesFlyout.downsamplePreviousIntervalWarmPhaseError',
              {
                defaultMessage:
                  'Must be greater than and a multiple of the hot phase value ({value})',
                values: { value: downsampleValues.hot.es },
              }
            ),
          });
        }
      }

      if (meta.cold.enabled && meta.cold.downsampleEnabled && downsampleValues.cold) {
        if (downsampleValues.warm) {
          if (!checkIfGreaterAndMultiple(downsampleValues.cold.ms, downsampleValues.warm.ms)) {
            ctx.addIssue({
              code: 'custom',
              path: ['_meta', 'cold', 'downsample', 'fixedIntervalValue'],
              message: i18n.translate(
                'xpack.streams.editIlmPhasesFlyout.downsamplePreviousIntervalColdPhaseWarmError',
                {
                  defaultMessage:
                    'Must be greater than and a multiple of the warm phase value ({value})',
                  values: { value: downsampleValues.warm.es },
                }
              ),
            });
          }
        } else if (downsampleValues.hot) {
          if (!checkIfGreaterAndMultiple(downsampleValues.cold.ms, downsampleValues.hot.ms)) {
            ctx.addIssue({
              code: 'custom',
              path: ['_meta', 'cold', 'downsample', 'fixedIntervalValue'],
              message: i18n.translate(
                'xpack.streams.editIlmPhasesFlyout.downsamplePreviousIntervalColdPhaseHotError',
                {
                  defaultMessage:
                    'Must be greater than and a multiple of the hot phase value ({value})',
                  values: { value: downsampleValues.hot.es },
                }
              ),
            });
          }
        }
      }

      const coldSnapshotsEnabled = meta.cold.enabled && meta.cold.searchableSnapshotEnabled;
      const frozenEnabled = meta.frozen.enabled;
      if (coldSnapshotsEnabled || frozenEnabled) {
        const repo = meta.searchableSnapshot.repository.trim();
        if (repo === '') {
          ctx.addIssue({
            code: 'custom',
            path: ['_meta', 'searchableSnapshot', 'repository'],
            message: i18n.translate(
              'xpack.streams.editIlmPhasesFlyout.searchableSnapshotRepoRequired',
              {
                defaultMessage: 'A snapshot repository is required.',
              }
            ),
          });
        }
      }
    });

  return schema;
};
