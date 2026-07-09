/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import { formatDuration, PRESERVED_TIME_UNITS, toMilliseconds } from '../../shared';
import type { DlmPhasesFlyoutFormInternal } from './types';

export const getDlmPhasesFlyoutFormSchema = (): z.ZodType<DlmPhasesFlyoutFormInternal> => {
  const preservedTimeUnitSchema = z.enum(PRESERVED_TIME_UNITS);
  const maxAfterValueChars = 100;

  const schema: z.ZodType<DlmPhasesFlyoutFormInternal> = z
    .object({
      frozen: z.object({
        enabled: z.boolean(),
        afterValue: z.string().max(
          maxAfterValueChars,
          i18n.translate('xpack.streams.editDlmPhasesFlyout.afterValueMaxLength', {
            defaultMessage: 'Must be {max} characters or less.',
            values: { max: maxAfterValueChars },
          })
        ),
        afterUnit: preservedTimeUnitSchema,
      }),
      delete: z.object({
        enabled: z.boolean(),
        afterValue: z.string().max(
          maxAfterValueChars,
          i18n.translate('xpack.streams.editDlmPhasesFlyout.afterValueMaxLength', {
            defaultMessage: 'Must be {max} characters or less.',
            values: { max: maxAfterValueChars },
          })
        ),
        afterUnit: preservedTimeUnitSchema,
      }),
    })
    .superRefine((data, ctx) => {
      const requiredMessage = i18n.translate('xpack.streams.editDlmPhasesFlyout.afterRequired', {
        defaultMessage: 'A value is required.',
      });
      const nonNegativeMessage = i18n.translate(
        'xpack.streams.editDlmPhasesFlyout.nonNegativeNumberRequired',
        {
          defaultMessage: 'A non-negative number is required.',
        }
      );
      const integerMessage = i18n.translate('xpack.streams.editDlmPhasesFlyout.integerRequired', {
        defaultMessage: 'An integer is required.',
      });

      const validate = (phase: 'frozen' | 'delete') => {
        const value = data[phase].afterValue.trim();
        if (!data[phase].enabled) return;

        if (value === '') {
          ctx.addIssue({
            code: 'custom',
            path: [phase, 'afterValue'],
            message: requiredMessage,
          });
          return;
        }

        const num = Number(value);
        if (!Number.isFinite(num) || num < 0) {
          ctx.addIssue({
            code: 'custom',
            path: [phase, 'afterValue'],
            message: nonNegativeMessage,
          });
          return;
        }

        if (!Number.isInteger(num)) {
          ctx.addIssue({
            code: 'custom',
            path: [phase, 'afterValue'],
            message: integerMessage,
          });
        }
      };

      validate('frozen');
      validate('delete');

      if (data.frozen.enabled && data.delete.enabled) {
        const frozenMs = toMilliseconds(data.frozen.afterValue.trim(), data.frozen.afterUnit);
        const deleteMs = toMilliseconds(data.delete.afterValue.trim(), data.delete.afterUnit);

        if (frozenMs >= 0 && deleteMs >= 0 && deleteMs < frozenMs) {
          const frozenEs =
            formatDuration(data.frozen.afterValue.trim(), data.frozen.afterUnit) ?? '';
          ctx.addIssue({
            code: 'custom',
            path: ['delete', 'afterValue'],
            message: i18n.translate(
              'xpack.streams.editDlmPhasesFlyout.deleteAfterSmallerThanFrozenAfterError',
              {
                defaultMessage: 'Must be greater or equal than the frozen phase value ({value})',
                values: { value: frozenEs },
              }
            ),
          });
        }
      }
    });

  return schema;
};
