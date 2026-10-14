/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  exceedsMaximumRetentionPeriod,
  getMaximumRetentionMessage,
  PRESERVED_TIME_UNITS,
} from '../../shared';
import { editDeletePhaseFlyoutI18n } from '../i18n';
import type { EditDeletePhaseFlyoutForm } from './types';

export const getEditDeletePhaseFlyoutFormSchema = ({
  maximumRetentionPeriod,
}: {
  maximumRetentionPeriod?: string;
} = {}): z.ZodType<EditDeletePhaseFlyoutForm> => {
  return z
    .object({
      minAgeValue: z.string(),
      minAgeUnit: z.enum(PRESERVED_TIME_UNITS),
      isUsingDefaultRetention: z.boolean(),
    })
    .superRefine((data, ctx) => {
      const value = data.minAgeValue.trim();
      if (value === '') {
        ctx.addIssue({
          code: 'custom',
          path: ['minAgeValue'],
          message: editDeletePhaseFlyoutI18n.minAgeRequiredErrorMessage,
        });
        return;
      }

      const num = Number(value);
      if (!Number.isFinite(num) || num < 0 || !Number.isInteger(num)) {
        ctx.addIssue({
          code: 'custom',
          path: ['minAgeValue'],
          message: editDeletePhaseFlyoutI18n.nonNegativeIntegerRequiredErrorMessage,
        });
        return;
      }

      if (
        maximumRetentionPeriod &&
        exceedsMaximumRetentionPeriod({
          value,
          unit: data.minAgeUnit,
          maximumRetentionPeriod,
        })
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['minAgeValue'],
          message: getMaximumRetentionMessage(maximumRetentionPeriod),
        });
      }
    });
};
